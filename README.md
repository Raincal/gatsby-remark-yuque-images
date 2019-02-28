# gatsby-remark-yuque-images

[![NPM version][npm-image]][npm-url]
[![LICENSE version][license-image]][license-url]

[npm-image]: https://img.shields.io/npm/v/gatsby-remark-yuque-images.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/gatsby-remark-yuque-images
[license-image]: https://img.shields.io/github/license/Raincal/gatsby-remark-yuque-images.svg?style=flat-square
[license-url]: https://github.com/Raincal/gatsby-remark-yuque-images/blob/master/LICENSE

Processes images from [语雀](https://www.yuque.com).

## Install

`npm install --save gatsby-remark-yuque-images`

## How to use

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-transformer-remark`,
    options: {
      plugins: [
        {
          resolve: `gatsby-remark-yuque-images`,
          options: {
            maxWidth: 746,
          },
        },
      ],
    },
  },
]
```

## Options

| Name                   | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxWidth`             | `746`   | The `maxWidth` in pixels of the `img` where the markdown will be displayed.                                                                                                                                                                                                                                                                                                                                                              |
| `linkImagesToOriginal` | `true`  | Add a link to each image to the original image. Sometimes people want to see a full-sized version of an image e.g. to see extra detail on a part of the image and this is a convenient and common pattern for enabling this. Set this option to false to disable this behavior.                                                                                                                                                          |
| `sizeByPixelDensity`   | `false` | Analyze images' pixel density to make decisions about target image size. This is what GitHub is doing when embedding images in tickets. This is a useful setting for documentation pages with a lot of screenshots. It can have unintended side effects on high-pixel density artworks.<br /><br />Example: A screenshot made on a retina screen with a resolution of 144 (e.g. Macbook) and a width of 100px, will be rendered at 50px. |

| `wrapperStyle`         |         | Add custom styles to the div wrapping the responsive images. Use regular CSS syntax, e.g. `margin-bottom:10px;`                                                                                                                                                                 |
| `backgroundColor`      | `white` | Set the background color of the image to match the background image of your design                                                                                                                                                                                              |

## LICENSE

[MIT](https://github.com/Raincal/gatsby-remark-yuque-images/blob/master/LICENSE)