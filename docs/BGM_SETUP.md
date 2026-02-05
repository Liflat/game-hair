# BGM (背景音楽) セットアップガイド

## 概要
このゲームはシーンごとに異なるフリーBGMを再生します。以下のガイドに従ってBGMファイルを準備してください。

## BGMファイルの準備

### 推奨フリーBGMサイト
以下のサイトから無料でBGMをダウンロードできます：

1. **Pixabay Music（推奨）**
   - URL: https://pixabay.com/music/
   - ライセンス: 商用利用可（クレジット不要）
   - 品質: 高品質
   - 特徴: 使いやすい、日本語対応

2. **Zapsplat**
   - URL: https://www.zapsplat.com/
   - ライセンス: 商用利用可（登録必要）
   - 品質: 高品質
   - 特徴: カテゴリが豊富

3. **Incompetech**
   - URL: https://www.incompetech.com/
   - ライセンス: CC-BY-NC（クレジット必須）
   - 品質: 高品質
   - 特徴: ゲーム向けの曲が豊富

### BGMページの詳細

各シーンに推奨されるBGMの種類：

| シーン | ファイル名 | 推奨される雰囲気 | 長さ | ループ |
|--------|-----------|-----------------|------|--------|
| スプラッシュ | /bgm/splash.mp3 | オープニング、サスペンス | 3-5秒 | 不可 |
| ホーム画面 | /bgm/home.mp3 | 落ち着き、ポップ | 1-3分 | 可 |
| ガチャ画面 | /bgm/gacha.mp3 | 楽しい、明るい、ポップ | 1-3分 | 可 |
| コレクション画面 | /bgm/collection.mp3 | 落ち着き、スムーズ | 1-3分 | 可 |
| ランキング画面 | /bgm/ranking.mp3 | 正式的、堂々とした | 1-3分 | 可 |
| トレーニング画面 | /bgm/training.mp3 | 集中、決意 | 1-3分 | 可 |
| マッチメイキング画面 | /bgm/matchmaking.mp3 | 期待、高揚感 | 1-3分 | 可 |
| バトル画面 | /bgm/battle.mp3 | 緊張感、アクション | 1-3分 | 可 |
| バトルロワイアル | /bgm/battle-royale.mp3 | 激しい、焦燥感 | 1-3分 | 可 |
| チームロワイアル | /bgm/team-royale.mp3 | 協力的、ダイナミック | 1-3分 | 可 |
| プロフィール画面 | /bgm/profile.mp3 | 落ち着き、親密感 | 1-3分 | 可 |

## インストール手順

### 1. BGMフォルダを作成
```bash
mkdir public/bgm
```

### 2. BGMファイルをダウンロード
- Pixabay Music から各シーン用のBGMをMP3形式でダウンロード
- ダウンロード時にライセンス条件を確認（通常は商用利用可）

### 3. ファイルを配置
ダウンロードしたMP3ファイルを以下のフォルダに配置：
```
public/
├── bgm/
│   ├── splash.mp3
│   ├── home.mp3
│   ├── gacha.mp3
│   ├── collection.mp3
│   ├── ranking.mp3
│   ├── training.mp3
│   ├── matchmaking.mp3
│   ├── battle.mp3
│   ├── battle-royale.mp3
│   ├── team-royale.mp3
│   └── profile.mp3
```

### 4. テスト
ゲームを起動して、各シーンでBGMが再生されることを確認してください。

## カスタマイズ

### BGMのボリューム調整
`hooks/use-bgm.ts` の `BGM_MAP` で各シーンのボリュームを調整：

```typescript
const options = {
  home: { volume: 0.3 },  // 30%のボリューム
  battle: { volume: 0.35 }, // 35%のボリューム
}
```

### BGMのON/OFF機能
HTMLの設定メニューに以下のコントロールを追加することで、ユーザーがBGMのON/OFFを切り替えられます：

```typescript
// components/screens で以下のようにコントアップしてください
const { toggleBGM, setVolume } = useBGM(currentScreen)

// トグルボタン
<button onClick={toggleBGM}>BGM切り替え</button>

// ボリュームスライダー
<input 
  type="range" 
  min="0" 
  max="1" 
  step="0.1" 
  onChange={(e) => setVolume(parseFloat(e.target.value))}
/>
```

## ライセンス確認

使用するBGMのライセンスを必ず確認してください。特に：
- **Pixabay Music**: クレジット不要で商用利用可
- **Zapsplat**: 登録が必要だが、商用利用可
- **Incompetech**: CC-BY-NC ライセンス（クレジット必須、商用利用不可）

## トラブルシューティング

### BGMが再生されない場合
1. ファイル名が正確に対応しているか確認
2. BGMファイルが `public/bgm/` フォルダに存在するか確認
3. MP3ファイル形式であるか確認（他の形式は対応していない可能性）
4. ブラウザのコンソールでエラーを確認

### BGMが途切れる場合
- BGMファイルの品質を確認（高品質なファイルを使用）
- ボリュームを下げてテスト
- 別のBGM素材を試す

## 参考リンク
- [Pixabay Music](https://pixabay.com/music/)
- [Zapsplat](https://www.zapsplat.com/)
- [Incompetech](https://www.incompetech.com/)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
