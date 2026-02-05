# BGM実装完了ガイド

## 実装内容

フリーBGM機能が追加されました。以下の機能が含まれます：

### 1. **BGM管理フック（`hooks/use-bgm.ts`）**
- 各シーンごとに自動的にBGMを切り替え
- BGMのON/OFF機能
- ボリューム調整機能
- ループ機能

### 2. **BGM設定ファイル（`lib/bgm-manifest.ts`）**
- 全BGMトラックのメタデータ
- 推奨ボリューム設定
- ライセンス情報

### 3. **BGM制御UIコンポーネント（`components/bgm-controls.tsx`）**
- BGMのON/OFFボタン
- ボリュームスライダー
- 各画面に埋め込み可能

### 4. **ゲームへの統合（`app/page.tsx`）**
- GameAppコンポーネントで `useBGM` を使用
- 画面切り替え時に自動的にBGMが変更

## 次のステップ

### 1. public/bgmフォルダを作成
以下のコマンドをターミナルで実行：
```bash
mkdir public/bgm
```

### 2. BGMファイルをダウンロードして配置
[BGM_SETUP.md](./BGM_SETUP.md) のガイドに従って、following フリーBGMサイトからBGMをダウンロード：
- Pixabay Music（推奨）
- Zapsplat
- Incompetech

### 3. ファイルの配置
ダウンロードしたMP3ファイルを `public/bgm/` に以下の名前で配置：
```
public/bgm/
├── splash.mp3
├── home.mp3
├── gacha.mp3
├── collection.mp3
├── ranking.mp3
├── training.mp3
├── matchmaking.mp3
├── battle.mp3
├── battle-royale.mp3
├── team-royale.mp3
└── profile.mp3
```

### 4. ボリューム調整（オプション）
`hooks/use-bgm.ts` の 42行目付近で各シーンの デフォルト ボリュームを調整可能：
```typescript
useBGM(currentScreen, { enabled: true, volume: 0.3 })
//                                            ^^^^
//                                      0（無音）〜 1（最大）
```

### 5. UIコンポーネント統合（オプション）
任意の画面にBGMコントロールを追加：
```tsx
import { BGMControls } from "@/components/bgm-controls"

export function MyScreen() {
  // ...
  return (
    <div>
      <BGMControls currentScreen="home" className="absolute top-4 right-4" />
      {/* 他のコンテンツ */}
    </div>
  )
}
```

## ファイル一覧

作成されたファイル：
- ✅ `hooks/use-bgm.ts` - BGM管理フック
- ✅ `lib/bgm-manifest.ts` - BGM設定ファイル
- ✅ `components/bgm-controls.tsx` - BGM制御UIコンポーネント
- ✅ `BGM_SETUP.md` - セットアップガイド
- ✅ `app/page.tsx` - useBGMの統合（更新済み）

## API リファレンス

### useBGM(screen, options)
```typescript
interface UseBGMOptions {
  enabled?: boolean   // BGM有効化（デフォルト: true）
  volume?: number     // ボリューム 0-1（デフォルト: 0.3）
}

interface UseBGMReturn {
  isPlaying: boolean              // 再生中か
  toggleBGM: () => void          // 再生/停止を切り替え
  setVolume: (vol: number) => void  // ボリュームを設定
}
```

## ブラウザ互換性

このBGM機能は以下のブラウザで動作します：
- Chrome/Chromium（最新版）
- Firefox（最新版）
- Safari（最新版）
- Edge（最新版）

※ 一部の古いブラウザではWeb Audio APIが定されていない可能性があります

## トラブルシューティング

### よくある問題

**Q: BGMが再生されない**
- A: 以下を確認してください：
  1. `public/bgm/` フォルダが存在するか
  2. ファイル名が正確か（大文字小文字を区別）
  3. MP3ファイル形式か
  4. ブラウザコンソールにエラーが出ていないか

**Q: BGMの音が小さい/大きい**
- A: `hooks/use-bgm.ts` の volume パラメータを調整してください

**Q: 一つの画面でBGMが複数再生される**
- A: `useBGM` は1つの画面につき1つだけ呼び出してください

## ライセンス注意点

使用するBGMのライセンスを必ず確認してください：
- **Pixabay Music**: クレジット不要、商用利用可 ✅
- **Zapsplat**: 商用利用可（登録が必要）✅
- **Incompetech**: CC-BY-NC（クレジット必須、商用利用不可）

## 参考資料

- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
- [Pixabay Music](https://pixabay.com/music/)
