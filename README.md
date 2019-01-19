# gatsby-remark-yuque-images

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

| Name                   | Default | Description                                                                                                                                                                                                                                                                     |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxWidth`             | `746`   | The `maxWidth` in pixels of the `img` where the markdown will be displayed.                                                                                                                                                                                                     |
| `linkImagesToOriginal` | `true`  | Add a link to each image to the original image. Sometimes people want to see a full-sized version of an image e.g. to see extra detail on a part of the image and this is a convenient and common pattern for enabling this. Set this option to false to disable this behavior. |
| `backgroundColor`      | `white` | Set the background color of the image to match the background image of your design                                                                                                                                                                                              |

## LICENSE

[MIT](./LICENSE)