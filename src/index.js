const visitWithParents = require(`unist-util-visit-parents`)
const { isYuqueImage, parseYuqueImage } = require(`./utils`)

module.exports = async ({ markdownAST }, pluginOptions) => {
  const defaults = {
    maxWidth: 746,
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
    const optionsMaxWidth = options.maxWidth
    const yuqueImgOriginalWidth = yuqueImage.styles.originWidth
    const yuqueImgWidth = yuqueImage.styles.width

    inLink = yuqueImage.styles.link || inLink

    const maxWidth =
      yuqueImgWidth === `746`
        ? optionsMaxWidth > yuqueImgOriginalWidth
          ? yuqueImgOriginalWidth
          : optionsMaxWidth
        : yuqueImgWidth

    const imageStyle = `
      width: 100%;
      max-width: ${maxWidth}px;
      box-shadow: inset 0px 0px 0px 400px ${options.backgroundColor};`.replace(
      /\s*(\S+:)\s*/g,
      `$1`
    )

    let imageTag = `
      <img
        style="${imageStyle}"
        alt="${node.alt}"
        title="${node.title ? node.title : ``}"
        src="${yuqueImage.url}"
      />
    `.trim()

    let rawHTML = imageTag

    // Make linking to original image optional.
    if (!inLink && options.linkImagesToOriginal) {
      rawHTML = `
        <a
          href="${yuqueImage.url}"
          target="_blank"
          rel="noopener"
        >
          ${imageTag}
        </a>
    `.trim()
    } else if (yuqueImage.styles.link) {
      // Make linking to the giving link.
      rawHTML = `
        <a
          href="${yuqueImage.styles.link}"
          target="${yuqueImage.styles.linkTarget}"
          rel="noopener"
        >
          ${imageTag}
        </a>
    `.trim()
    }

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
