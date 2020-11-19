import './style.css';
import { ImageCapture } from 'image-capture';

const rect = document.getElementById('rect');

const toggleColor = () => {
  rect.classList.toggle('red');
  rect.classList.toggle('blue');
};

function nextPaint() {
  return new Promise(requestAnimationFrame);
}

const canvasEl = document.createElement('canvas');
const ctx = canvasEl.getContext('2d');

let mediaStream;
let capturer = null;

const captureFrameRate = 30;
const width = 640;
const height = 480;
let running = false;

canvasEl.width = width;
canvasEl.height = height;

const worker = new Worker('./worker.js');

let pendingWorkerPromiseResolver = null;

worker.onmessage = (event) => {
  pendingWorkerPromiseResolver(event.data);
};

const sendImageDataAndWait = (imageData) => {
  worker.postMessage({
    type: 'ImageData',
    imageData: {
      width: imageData.width,
      height: imageData.height,
      buffer: imageData.data.buffer,
      bgColor: rect.className,
    },
  }, [imageData.data.buffer]);

  return new Promise((resolve) => {
    pendingWorkerPromiseResolver = resolve;
  });
};

const runForever = async () => {
  const captureFrame = () => {
    if (capturer === null) {
      capturer = new ImageCapture(mediaStream.getVideoTracks()[0]);
    }

    return capturer.grabFrame();
  };
  const processFrame = (frame) => {
    ctx.drawImage(frame, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    return sendImageDataAndWait(imageData);
  };

  let runs = [];
  let workerTimings = [];

  const avgColor = document.getElementById('avgColor');
  const fpsCounter = document.getElementById('fps');
  const workerFPS = document.getElementById('workerFPS');

  const mean = (array) => array.reduce((a, b) => a + b) / array.length;

  let framePromise = captureFrame();
  running = true;
  while (running) {
    try {
      const resultPromise = processFrame(await framePromise);
      framePromise = captureFrame();

      // Measure the run time of the worker for the frame
      const start = performance.now();
      const result = await resultPromise;
      console.log(result);
      toggleColor();
      await nextPaint();
      const now = performance.now();
      workerTimings.unshift(now - start);
      workerTimings = workerTimings.slice(0, 60);

      runs.push(now);

      const timeCutoff = now - 2000;
      runs = runs.filter((run) => run >= timeCutoff);
      const fps = runs.length / 2;
      avgColor.style.background = `rgb(${result[0].join(',')})`;
      fpsCounter.innerText = `Overall: ${Math.floor(fps)} FPS`;
      workerFPS.innerText = `Worker: ${Math.floor(1000 / mean(workerTimings))} FPS`;
    } catch (err) {
      console.error('Unexpected error');
      console.error(err);
    }
  }
};

document.getElementById('start').onclick = async () => {
  if (!running) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { exact: width },
          height: { exact: height },
          frameRate: { exact: captureFrameRate },
        },
      });
    } catch (err) {
      console.error(err);
      alert(err.name);
    }
    runForever();
  }
};

document.getElementById('stop').onclick = () => {
  running = false;
  capturer = null;
  mediaStream.getTracks().forEach((track) => {
    if (track.readyState === 'live') {
      track.stop();
    }
  });
};
