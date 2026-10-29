import * as ecs from '@8thwall/ecs'

// イメージターゲットを認識した位置にキャラを置き、見失っても消さないコンポーネント。
// 「アンカー」用の空エンティティ(シーン直下、ターゲットの子ではない)に付ける。
// キャラ(glTF)はそのアンカーの子にする。
//
// 元ネタ: サンプルの src/toggle-slam/toggle-slam-on-found.ts と同じ方式。
//   認識時に reality.imagefound の位置を受け取ってコンテンツを置く。
ecs.registerComponent({
  name: 'Keep After Image Target Lost',
  schema: {
    imageTargetName: ecs.string,
    // アニメーションを再生したい glTF モデルのエンティティ(任意)
    model: ecs.eid,
  },
  schemaDefaults: {
    imageTargetName: '',
  },
  stateMachine: ({world, eid, schemaAttribute}) => {
    // ターゲットの位置・向き・大きさをアンカーに反映する。名前が違えば false。
    const place = (e: any) => {
      const {name, position, rotation, scale} = e.data as any
      const {imageTargetName} = schemaAttribute.get(eid)
      if (name !== imageTargetName) return false

      world.setPosition(eid, position.x, position.y, position.z)
      world.setQuaternion(eid, rotation.x, rotation.y, rotation.z, rotation.w)
      world.setScale(eid, scale, scale, scale)
      return true
    }

    ecs.defineState('default')
      .initial()
      .onEnter(() => {
        // 見つかるまでは非表示。アニメーションも止めておく。
        ecs.Hidden.set(world, eid)
        const {model} = schemaAttribute.get(eid)
        if (model) {
          ecs.GltfModel.mutate(world, model, (c) => {
            c.paused = true
          })
        }
      })
      .listen(world.events.globalId, 'reality.imagefound', (e) => {
        if (!place(e)) return

        ecs.Hidden.remove(world, eid)
        const {model} = schemaAttribute.get(eid)
        if (model) {
          ecs.GltfModel.mutate(world, model, (c) => {
            c.paused = false
          })
        }
      })
      // ターゲットが見えている間は追従させる(見失った時は何もしない=そのまま残る)
      .listen(world.events.globalId, 'reality.imageupdated', (e) => {
        place(e)
      })
  },
})
