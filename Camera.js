var Camera = {
  live: false,
  container: undefined,
  video: undefined,
  params: {
    width: 0,
    height: 0,
    imageFormat: 'jpeg',
    jpegQuality: 100,
    objectFit: 'cover'
  },
  cameraWidth: 0,
  cameraHeight: 0,
  cameraIdentifiers: [],
  cameraIndex: 0,
  init: function () {
    return navigator.mediaDevices.enumerateDevices().then(devices => {
      this.cameraIdentifiers = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => d.deviceId)
    })
  },
  attach: function (element) {
    return new Promise((resolve, reject) => {
      if (typeof (element) === 'string') {
        this.container = document.getElementById(element) || document.querySelector(element)
      }
      if (!this.container) {
        reject(new Error('Could not locate DOM element to attach to.'))
      }

      this.params.width = this.params.width || this.container.offsetWidth
      this.params.height = this.params.height || this.container.offsetHeight

      this.video = document.createElement('video')
      this.video.setAttribute('autoplay', '')
      this.video.setAttribute('playsinline', '')
      this.video.style['object-fit'] = this.params.objectFit
      this.video.style.width = this.params.width + 'px'
      this.video.style.height = this.params.height + 'px'

      this.container.appendChild(this.video)
      this.container.style.width = this.params.width + 'px'
      this.container.style.height = this.params.height + 'px'

      const constraints = Camera.cameraIdentifiers.length === 0
        ? {
          video: true,
          audio: false
        }
        : {
          video: {
            width: {min: 640, ideal: 1280, max: 1920},
            height: {min: 480, ideal: 720, max: 1080},
            deviceId: {
              exact: this.cameraIdentifiers[this.cameraIndex]
            },
            facingMode: 'environment'
          },
          audio: false
        }

      const success = stream => {
        this.video.srcObject = stream
        this.stream = stream
        this.live = true
        resolve()
      }
      navigator.getUserMedia(constraints, success, err => reject(err))
    })
  },
  set: function () {
    if (arguments.length === 1) {
      Object.keys(arguments[0]).forEach(key => {
        this.params[key] = arguments[0][key]
      })
    } else {
      this.params[arguments[0]] = arguments[1]
    }
    return this
  },
  snap: function () {
    return new Promise((resolve, reject) => {
      if (!this.live) {
        reject(new Error('Camera is not live yet'))
      }

      const canvas = document.createElement('canvas')
      canvas.width = this.video.videoWidth * 2
      canvas.height = this.video.videoHeight * 2

      const context = canvas.getContext('2d')
      context.drawImage(this.video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/' + this.params.imageFormat, this.params.jpegQuality / 100), canvas, context)
    })
  },
  switchCamera: function () {
    delete this.stream
    delete this.video

    this.container.innerHTML = ''
    this.live = false
    this.cameraIndex = (this.cameraIndex + 1) % this.cameraIdentifiers.length
    alert(this.cameraIndex)
    const elementId = this.container.id
    delete this.container
    return this.attach(elementId)
  },
  upload: function (base64Data, url, progressCallback) {
    return new Promise((resolve, reject) => {
      let imageType = ''
      let extension = ''
      if (base64Data.match(/^data:image\/(\w+)/)) {
        imageType = RegExp.$1
        extension = imageType.replace(/e/, '')
      } else {
        throw new Error('Cannot locate image format in Data URI')
      }

      const rawImageData = base64Data.replace(/^data:image\/\w+;base64,/, '')
      const blob = new Blob([base64DecToArr(rawImageData)], {type: 'image/' + imageType})
      const form = new FormData()
      form.append('file', blob, '.' + extension)

      const http = new XMLHttpRequest()
      http.open('POST', url, true)
      if (progressCallback && http.upload && http.upload.addEventListener) {
        http.upload.addEventListener('progress', function (e) {
          e.lengthComputable && progressCallback(e.loaded / e.total)
        }, false)
      }
      http.onload = function () {
        console.log(http.status)
        if (http.status === 200) {
          resolve(http.responseText)
        } else {
          reject(http.responseText)
        }
      }
      http.send(form)
    })
    function base64DecToArr (sBase64, nBlocksSize) {
      /* eslint-disable*/
      var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ''), nInLen = sB64Enc.length,
        nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2,
        taBytes = new Uint8Array(nOutLen)

      for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
        nMod4 = nInIdx & 3
        nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4
        if (nMod4 === 3 || nInLen - nInIdx === 1) {
          for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
            taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255
          }
          nUint24 = 0
        }
      }
      return taBytes

      function b64ToUint6 (nChr) {
        return nChr > 64 && nChr < 91 ? nChr - 65
          : nChr > 96 && nChr < 123 ? nChr - 71
            : nChr > 47 && nChr < 58 ? nChr + 4
              : nChr === 43 ? 62 : nChr === 47 ? 63 : 0
      }
    }
  }
}
Camera.init()
export default Camera
