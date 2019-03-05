const visitWithParents = require(`unist-util-visit-parents`)
const crypto = require(`crypto`)
const axios = require(`axios`)
const {
  getMaxWidth,
  isYuqueImage,
  parseYuqueImage,
  buildResponsiveSizes
} = require(`./utils`)

// If the image is hosted on yuque
// 1. Find the image file
// 2. Find the image's size
// 3. Filter out any responsive image sizes that are greater than the image's width
// 4. Create the responsive images.
// 5. Set the html w/ aspect ratio helper.

module.exports = async ({ markdownAST, cache, reporter }, pluginOptions) => {
  const defaults = {
    maxWidth: 746,
    withWebp: true,
    wrapperStyle: ``,
    backgroundColor: `white`,
    linkImagesToOriginal: true
  }

  const options = { ...defaults, ...pluginOptions }

  const findParentLinks = ({ children }) =>
    children.some(
      node =>
        (node.type === `html` && !!node.value.match(/<a /)) ||
        node.type === `link`
    )

  const findInlineImage = ({ children }) =>
    children.some(
      (node, i) =>
        node.type == 'image' &&
        children[i - 1] &&
        (children[i - 1].type == 'image' || children[i - 1].type == 'text')
    )

  // This will only work for markdown syntax image tags
  let markdownImageNodes = []

  visitWithParents(markdownAST, `image`, (node, ancestors) => {
    const isInLink = ancestors.some(findParentLinks)
    const isInline = ancestors.some(findInlineImage)

    markdownImageNodes.push({
      node,
      isInLink,
      isInline
    })
  })

  // Takes a node and generates the needed images and then returns
  // the needed HTML replacement for the image
  const generateImagesAndUpdateNode = async (
    node,
    resolve,
    isInLink,
    isInline,
    yuqueImage
  ) => {
    const originalImg = yuqueImage.url
    const optionsMaxWidth = options.maxWidth
    const yuqueImgAlt = node.alt ? node.alt.split('.').shift() : ''

    let maxWidth = optionsMaxWidth

    isInLink = yuqueImage.styles.link || isInLink

    const optionsHash = crypto
      .createHash(`md5`)
      .update(JSON.stringify(options))
      .digest(`hex`)

    const cacheKey = `remark-images-yq-${yuqueImage.styles.name}-${optionsHash}`
    let cahedRawHTML = await cache.get(cacheKey)

    if (cahedRawHTML) {
      return cahedRawHTML
    }

    try {
      const response = await axios({
        method: `GET`,
        url: `${originalImg}?x-oss-process=image/info`
      })

      const { FileSize, ImageWidth, ImageHeight } = response.data

      const metadata = {
        fileSize: +FileSize.value,
        width: +ImageWidth.value,
        height: +ImageHeight.value
      }

      const yuqueImgWidth = yuqueImage.styles.width || metadata.width
      const yuqueImgOriginalWidth =
        yuqueImage.styles.originWidth || metadata.width

      options.maxWidth = maxWidth =
        yuqueImgWidth >= `746`
          ? getMaxWidth(optionsMaxWidth, yuqueImgOriginalWidth)
          : getMaxWidth(optionsMaxWidth, yuqueImgWidth)

      const responsiveSizesResult = await buildResponsiveSizes({
        metadata,
        imageUrl: originalImg,
        options
      })

      // Calculate the paddingBottom %
      const ratio = `${(1 / responsiveSizesResult.aspectRatio) * 100}%`

      const fallbackSrc = originalImg
      const srcSet = responsiveSizesResult.srcSet
      const presentationWidth = responsiveSizesResult.presentationWidth

      const inlineImgStyle = `
        display: inline-block;
        width: ${maxWidth}px;
        vertical-align: top;
      `

      // Create our base image tag
      let imageTag = `
      <img
        class="gatsby-resp-image-image"
        style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0; box-shadow: inset 0px 0px 0px 400px ${
          options.backgroundColor
        };"
        alt="${yuqueImgAlt}"
        title="${node.title ? node.title : ``}"
        src="${fallbackSrc}"
        srcset="${srcSet}"
        sizes="${responsiveSizesResult.sizes}"
      />
   `.trim()

      // if options.withWebp is enabled, add a webp version and change the image tag to a picture tag
      if (options.withWebp) {
        imageTag = `
        <picture>
          <source
            srcset="${responsiveSizesResult.webpSrcSet}"
            sizes="${responsiveSizesResult.sizes}"
            type="image/webp"
          />
          <source
            srcset="${srcSet}"
            sizes="${responsiveSizesResult.sizes}"
          />
          <img
            class="gatsby-resp-image-image"
            style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0; box-shadow: inset 0px 0px 0px 400px ${
              options.backgroundColor
            };"
            alt="${yuqueImgAlt}"
            title="${node.title ? node.title : ``}"
            src="${fallbackSrc}"
          />
        </picture>
      `.trim()
      }

      // Construct new image node w/ aspect ratio placeholder
      let rawHTML = `
  <span
    class="gatsby-resp-image-wrapper"
    style="position: relative; display: block; max-width: ${maxWidth}px; margin-left: auto; margin-right: auto; ${
        isInline ? inlineImgStyle : ''
      }${options.wrapperStyle}"
  >
    <span
      class="gatsby-resp-image-background-image"
      style="padding-bottom: ${ratio}; position: relative; bottom: 0; left: 0; background-image: url('${
        responsiveSizesResult.base64
      }'); background-size: cover; display: block;"
    ></span>
    ${imageTag}
  </span>
  `.trim()

      // Make linking to original image optional.
      if (!isInLink && options.linkImagesToOriginal) {
        rawHTML = `
<a
  class="gatsby-resp-image-link"
  href="${originalImg}"
  style="display: ${isInline ? `inline-block` : `block`}"
  target="_blank"
  rel="noopener"
>
${rawHTML}
</a>
  `.trim()
      } else if (yuqueImage.styles.link) {
        // Make linking to the giving link.
        rawHTML = `
<a
  class="gatsby-resp-image-link"
  href="${yuqueImage.styles.link}"
  style="display: block"
  target="_blank"
  rel="noopener"
>
  ${rawHTML}
</a>
  `.trim()
      }

      await cache.set(cacheKey, rawHTML)
      return rawHTML
    } catch (error) {
      reporter.error(error)
      return null
    }
  }

  return Promise.all(
    markdownImageNodes.map(
      ({ node, isInLink, isInline }) =>
        new Promise(async (resolve, reject) => {
          if (isYuqueImage(node.url)) {
            const yuqueImage = parseYuqueImage(node.url)
            const fileType = yuqueImage.url.split(`.`).pop()

            if (fileType !== `gif` && fileType !== `svg`) {
              const rawHTML = await generateImagesAndUpdateNode(
                node,
                resolve,
                isInLink,
                isInline,
                yuqueImage
              )

              if (rawHTML) {
                // Replace the image node with an inline HTML node.
                node.type = `html`
                node.value = rawHTML
              }

              return resolve(node)
            } else {
              return resolve()
            }
          } else {
            // Image isn't from yuque so there's nothing for us to do.
            return resolve()
          }
        })
    )
  )
}
