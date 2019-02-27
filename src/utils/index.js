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
  const { width, height, density } = metadata
  const aspectRatio = width / height
  const pixelRatio =
    options.sizeByPixelDensity && typeof density === `number` && density > 0
      ? density / 72
      : 1

  const presentationWidth = Math.min(
    options.maxWidth,
    Math.round(width / pixelRatio)
  )
  const presentationHeight = Math.round(presentationWidth * (height / width))

  if (!options.sizes) {
    options.sizes = `(max-width: ${presentationWidth}px) 100vw, ${presentationWidth}px`
  }

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

  return {
    base64: base64Img,
    aspectRatio,
    srcSet,
    src: imageUrl,
    sizes: options.sizes,
    density,
    presentationWidth,
    presentationHeight
  }
}

const isYuqueImage = url => {
  return url.includes(`https://cdn.nlark.com/yuque`)
}

const parseYuqueImage = link => {
  let [url, params] = link.split(`#`)
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
  isYuqueImage,
  parseYuqueImage
}
