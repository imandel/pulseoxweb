// borrowerd from https://github.com/dsanders11/imagebitmap-getimagedata-demo

const xStride = 10;
const yStride = 10;

const getAverageColor = (imageData) => {
  const { data, width, height } = imageData;

  let red = 0;
  let green = 0;
  let blue = 0;

  for (let y = 0; y < height; y += yStride) {
    for (let x = 0; x < width; x += xStride) {
      const startIdx = (y * width * 4) + x * 4;

      red += data[startIdx];
      green += data[startIdx + 1];
      blue += data[startIdx + 2];
    }
  }

  const pixelCount = (width / xStride) * (height / yStride);

  return [
    red / pixelCount,
    green / pixelCount,
    blue / pixelCount,
  ];
};

onmessage = async (event) => {
  const {
    width, height, buffer, bgColor,
  } = event.data.imageData;
  const data = new Uint8ClampedArray(buffer);

  postMessage([getAverageColor(new ImageData(data, width, height)), bgColor]);
};
