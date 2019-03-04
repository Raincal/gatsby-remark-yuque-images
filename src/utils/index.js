const axios = require(`axios`)

const getBase64Img = async url => {
  const response = await axios({
    method: `GET`,
    responseType: `arraybuffer`,
    url: `${url}`
  })

  const base64Img = `data:${
    response.headers[`content-type`]
  };base64,${Buffer.from(response.data).toString(`base64`)}`

  return base64Img
}

const buildResponsiveSizes = async ({ metadata, imageUrl, options = {} }) => {
  const { fileSize, width, height } = metadata
  const aspectRatio = width / height
  const pixelRatio = 1

  const presentationWidth = Math.min(
    options.maxWidth,
    Math.round(width / pixelRatio)
  )
  const presentationHeight = Math.round(presentationWidth * (height / width))

  const sizes = `(max-width: ${presentationWidth}px) 100vw, ${presentationWidth}px`

  const images = []

  images.push(metadata.width / 4)
  images.push(metadata.width / 2)
  images.push(metadata.width)
  images.push(metadata.width * 1.5)
  images.push(metadata.width * 2)
  images.push(metadata.width * 3)

  const filteredSizes = images.filter(size => size < width)

  filteredSizes.push(width)

  const base64Img = await getBase64Img(
    `${imageUrl}?x-oss-process=image/resize,w_20`
  )

  const srcSet = filteredSizes
    .map(
      size =>
        `${imageUrl}?x-oss-process=image/resize,w_${Math.round(
          size
        )} ${Math.round(size)}w`
    )
    .join(`,\n`)

  const webpSrcSet = filteredSizes
    .map(size =>
      options.withWebp.quality && fileSize > 10000
        ? `${imageUrl}?x-oss-process=image/resize,w_${Math.round(
            size
          )}/format,webp/quality,q_${options.withWebp.quality} ${Math.round(
            size
          )}w`
        : `${imageUrl}?x-oss-process=image/resize,w_${Math.round(
            size
          )}/format,webp ${Math.round(size)}w`
    )
    .join(`,\n`)

  return {
    base64: base64Img,
    aspectRatio,
    srcSet,
    webpSrcSet,
    src: imageUrl,
    sizes,
    presentationWidth,
    presentationHeight
  }
}

const getMaxWidth = (optionsMaxWidth, imageWidth) => {
  return optionsMaxWidth > imageWidth ? imageWidth : optionsMaxWidth
}

const isYuqueImage = url => {
  return /https:\/\/cdn.(yuque|nlark).com\/yuque/.test(url)
}

const parseYuqueImage = link => {
  let [url, params] = link.split(`#`)
  url = url.includes('x-oss-process') ? url.split('?').shift() : url
  const styles = paramsToObject(new URLSearchParams(params))
  return {
    url,
    styles
  }
}

const paramsToObject = entries => {
  let result = {}
  for (let entry of entries) {
    result[entry[0]] = entry[1]
  }
  return result
}

module.exports = {
  buildResponsiveSizes,
  getMaxWidth,
  isYuqueImage,
  parseYuqueImage
}
