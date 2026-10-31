const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [
      require('../image-targets/DSC_0031.json'),
      require('../image-targets/DSC_0024.json'),
      require('../image-targets/DSC_0033.json'),
      require('../image-targets/DSC_0018.json'),
      require('../image-targets/DSC_0051.json'),
      require('../image-targets/DSC_0053.json'),
      require('../image-targets/DSC_0054.json'),
      require('../image-targets/goal-1.json')
    ],
  })
  XR8.addCameraPipelineModule(LandingPage.pipelineModule())

  // --- 音声の準備 ---
  const audioMap = {
    DSC_0031: new Audio('assets/sound/1.wav'),
    DSC_0033: new Audio('assets/sound/2.wav'),
    DSC_0024: new Audio('assets/sound/3.wav'),
    DSC_0018: new Audio('assets/sound/9.wav'),
    DSC_0051: new Audio('assets/sound/5.wav'),
    DSC_0053: new Audio('assets/sound/6.wav'),
    DSC_0054: new Audio('assets/sound/7.wav'),
    'goal-1': new Audio('assets/sound/8.wav'),
  }

  // 事前ロード
  Object.values(audioMap).forEach((audio) => {
    audio.preload = 'auto'
  })

  // --- スマホの自動再生制限の解除 ---
  // 最初のタップ(touchend / click など)で、全音声を「無音で」一度だけ再生→停止して許可を取る。
  // iOS は touchstart では許可されないことがあるので touchend / click も拾う。
  let unlocked = false
  const unlockAudio = () => {
    if (unlocked) return
    unlocked = true
    Object.values(audioMap).forEach((audio) => {
      audio.muted = true
      const restore = () => {
        audio.pause()
        audio.currentTime = 0
        audio.muted = false
      }
      const p = audio.play()
      if (p && p.then) {
        p.then(restore).catch(restore)
      } else {
        restore()
      }
    })
  }
  ;['touchstart', 'touchend', 'pointerdown', 'click'].forEach((ev) => {
    // capture: true … AR のキャンバス側で伝播が止められても拾えるようにする
    window.addEventListener(ev, unlockAudio, {capture: true, passive: true})
  })

  // --- イメージターゲット認識時の処理 ---
  // onUpdate ではなく listeners で 'reality.imagefound' を受ける。
  // (onUpdate の引数には detail が無いので、以前のコードでは常に return されていた)
  // ・見失っても音は止めない(最後まで鳴らす)
  // ・同じターゲットを再認識しても、再生中なら何もしない(頭から再生し直さない)
  // ・別のターゲットを認識したら、鳴っている他の音は止めてから再生する(重ねない)
  XR8.addCameraPipelineModule({
    name: 'multi-sound-on-target',
    listeners: [
      {
        event: 'reality.imagefound',
        process: ({detail}) => {
          const audio = audioMap[detail.name]
          if (!audio) return

          // すでにこの音が再生中なら、そのまま鳴らし続ける
          if (!audio.paused && !audio.ended) return

          // 他の音を止める(次に鳴らすときは頭から)
          Object.values(audioMap).forEach((other) => {
            if (other !== audio && !other.paused) {
              other.pause()
              other.currentTime = 0
            }
          })

          const p = audio.play()
          if (p && p.catch) {
            p.catch((err) => console.warn('audio play failed:', detail.name, err))
          }
        },
      },
    ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
