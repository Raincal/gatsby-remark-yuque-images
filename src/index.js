const visitWithParents = require(`unist-util-visit-parents`)
const crypto = require(`crypto`)
const sharp = require(`sharp`)
const axios = require(`axios`)
const {
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

module.exports = async ({ markdownAST, cache }, pluginOptions) => {
  const defaults = {
    maxWidth: 746,
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

  // This will only work for markdown syntax image tags
  let markdownImageNodes = []

  visitWithParents(markdownAST, `image`, (node, ancestors) => {
    const inLink = ancestors.some(findParentLinks)

    markdownImageNodes.push({
      node,
      inLink
    })
  })

  // Takes a node and generates the needed images and then returns
  // the needed HTML replacement for the image
  const generateImagesAndUpdateNode = async (
    node,
    resolve,
    inLink,
    yuqueImage
  ) => {
    const originalImg = yuqueImage.url
    const optionsMaxWidth = options.maxWidth
    const yuqueImgOriginalWidth = yuqueImage.styles.originWidth
    const yuqueImgWidth = yuqueImage.styles.width
    const yuqueImgAlt = node.alt.split('.').shift()

    inLink = yuqueImage.styles.link || inLink

    const maxWidth =
      yuqueImgWidth === `746`
        ? optionsMaxWidth > yuqueImgOriginalWidth
          ? yuqueImgOriginalWidth
          : optionsMaxWidth
        : yuqueImgWidth

    const optionsHash = crypto
      .createHash(`md5`)
      .update(JSON.stringify(options))
      .digest(`hex`)

    const cacheKey = `remark-images-yq-${yuqueImage.styles.name}-${optionsHash}`
    let cahedRawHTML = await cache.get(cacheKey)

    if (cahedRawHTML) {
      return cahedRawHTML
    }
    const metaReader = sharp()

    const response = await axios({
      method: `GET`,
      url: originalImg,
      responseType: `stream`
    })

    response.data.pipe(metaReader)

    const metadata = await metaReader.metadata()

    response.data.destroy()

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

    // Construct new image node w/ aspect ratio placeholder
    let rawHTML = `
  <span
    class="gatsby-resp-image-wrapper"
    style="position: relative; display: block; ${
      options.wrapperStyle
    }; max-width: ${maxWidth}px; margin-left: auto; margin-right: auto;"
  >
    <span
      class="gatsby-resp-image-background-image"
      style="padding-bottom: ${ratio}; position: relative; bottom: 0; left: 0; background-image: url('${
      responsiveSizesResult.base64
    }'); background-size: cover; display: block;"
    ></span>
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
  </span>
  `.trim()

    // Make linking to original image optional.
    if (options.linkImagesToOriginal) {
      rawHTML = `
<a
  class="gatsby-resp-image-link"
  href="${originalImg}"
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
  }

  return Promise.all(
    markdownImageNodes.map(
      ({ node, inLink }) =>
        new Promise(async (resolve, reject) => {
          if (isYuqueImage(node.url)) {
            const yuqueImage = parseYuqueImage(node.url)
            const fileType = yuqueImage.url.split(`.`).pop()

            if (fileType !== `gif` && fileType !== `svg`) {
              const rawHTML = await generateImagesAndUpdateNode(
                node,
                resolve,
                inLink,
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
