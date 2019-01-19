function isYuqueImage(url) {
  return url.includes(`https://cdn.nlark.com/yuque`)
}

function parseYuqueImage(link) {
  let [url, params] = link.split(`#`)
  const styles = paramsToObject(new URLSearchParams(params))
  return {
    url,
    styles,
  }
}

function paramsToObject(entries) {
  let result = {}
  for (let entry of entries) {
    result[entry[0]] = entry[1]
  }
  return result
}

module.exports = {
  isYuqueImage,
  parseYuqueImage,
}