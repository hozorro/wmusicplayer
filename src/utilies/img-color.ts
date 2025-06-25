const useColor  = () => {
  function rgbToHex(rgb:string) {
    var hex = "#";
    rgb.split(',').forEach(function(value) {
      var hexPart = parseInt(value).toString(16);
      hex += hexPart.length === 1 ? "0" + hexPart : hexPart;
    });
    return hex;
  }

  function getColorsFromImageData(imageData: Uint8ClampedArray, width: number, height: number, bounce: number = 4): AnalysColors {
    const colorCount: Record<string, number> = {}
    let r = 0, g = 0, b = 0;
    let totalPixels = width * height;

    // 初始化四角颜色和中央颜色数组
    const cornerColors: rgbColor[] = [
      [255,255,255],[255,255,255],[255,255,255],[255,255,255]
    ];
    let centerColor: rgbColor = [255,255,255];

    for (let i = 0; i < imageData.length; i += 4) {
      const red = imageData[i];
      const green = imageData[i + 1];
      const blue = imageData[i + 2];
      const alpha = imageData[i + 3];
      if (alpha === 0) continue;

      let bounceRange = bounce * 2
      let bounceRed = Math.round(red / bounceRange) * bounceRange;
      let bounceGreen = Math.round(green / bounceRange) * bounceRange;
      let bounceBlue = Math.round(blue / bounceRange) * bounceRange;
      
      const colorKey = `${bounceRed},${bounceGreen},${bounceBlue}`;
      
      colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;

      r += red;
      g += green;
      b += blue;

      // 确定像素点是四角还是中央
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      if (x === 0 &&  y === 0) cornerColors[0] = [bounceRed, bounceGreen, bounceBlue];
      else if (x === width - 1 && y === 0) cornerColors[1] = [bounceRed, bounceGreen, bounceBlue];
      else if (x === 0 && y === height - 1) cornerColors[2] = [bounceRed, bounceGreen, bounceBlue];
      else if (x === width - 1 && y === height - 1) cornerColors[3] = [bounceRed, bounceGreen, bounceBlue];
      else if (x === Math.floor(width / 2) && y === Math.floor(height / 2)) centerColor = [bounceRed, bounceGreen, bounceBlue];
    }

    // 找到主要和次主要颜色
    let dominantColor: rgbColor = [255, 255, 255], secondDominantColor: rgbColor = [255, 255, 255]
    let maxCount = 0, secondMaxCount = 0;

    for (const [color, count] of Object.entries(colorCount)) {
      if (count > maxCount) {
        secondMaxCount = maxCount;
        secondDominantColor = dominantColor;
        maxCount = count;
        dominantColor = color.split(',').map(Number) as rgbColor;
      } else if (count > secondMaxCount) {
        secondMaxCount = count;
        secondDominantColor = color.split(',').map(Number) as rgbColor;
      }
    }

    // 计算平均颜色
    const avgColor: rgbColor = [Math.round(r / totalPixels), Math.round(g / totalPixels), Math.round(b / totalPixels)]

    return {
      corners: cornerColors,
      center: centerColor,
      dominant: dominantColor,
      secondDominant: secondDominantColor,
      average: avgColor
    };
  }
  
  function createGradientBg(colors:rgbColor[], positions: number[], alpha = 1, angle: number = 180): string {
    if (colors.length - 1 > positions.length) {
      colors.splice(positions.length + 1);
    } else {
      positions.splice(colors.length - 1);
    }
    
    const gradientStops = colors.slice(1).map((c, i) => `rgba(${c.join(',')}, ${alpha}) ${positions[i]}%`).join(', ')
    return `background: rgba(${colors[0].join(',')}, ${alpha});
      background: linear-gradient(${angle}deg, ${gradientStops});`
  }

  async function analyseImageColor(img: HTMLImageElement){
    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.warn('[analyseImageColor] image has zero width or height, skipping analysis.')
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      return getColorsFromImageData(imageData, canvas.width, canvas.height, 8)
    } catch (err) {
      console.error('[analyseImageColor] failed to get image data:', err);
      return;
    }
    
  }

  function convertDarkColor(rgb: rgbColor): rgbColor {
    const [r, g, b] = rgb;
    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    if (brightness > 186) {
      let weighted = [r * 0.299, g * 0.587, b * 0.114]
      let max = Math.max(...weighted);
      let index = weighted.indexOf(max);
      let ratio = max / rgb[index]
      return [r * ratio, g * ratio, b * ratio]
    }
    return rgb
  }

  async function createGradientBgFromImg(img: HTMLImageElement) {
    const colors = await analyseImageColor(img)
    if(colors) {
      const {dominant, corners, center} = colors
      const colorsArr = [dominant, corners[1], center, corners[3]]
      return createGradientBg(colorsArr, [0, 65,100])
    }
    return '';
  }

  return {
    rgbToHex,
    getColorsFromImageData,
    createGradientBg,
    analyseImageColor,
    convertDarkColor,
    createGradientBgFromImg
  }
};

export default useColor;