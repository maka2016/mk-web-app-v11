# 音乐播放器组件

这个目录包含了音乐播放状态管理组件，用于在应用中播放音乐。

## 组件说明

### MusicProvider

音乐播放状态管理器，提供全局的音乐播放状态和功能。

```tsx
import { MusicProvider, useMusic } from './Music';

const App = () => {
  return (
    <MusicProvider>
      <MyComponent />
    </MusicProvider>
  );
};

const MyComponent = () => {
  const {
    playing,
    playingSrc,
    currentMusic,
    togglePlay,
    pause,
    stop,
    setMusic,
    closeMusic,
    isPlaying,
  } = useMusic();

  const handleToggleMusic = async (url: string) => {
    await togglePlay(url);
  };

  const handleSetMusic = () => {
    setMusic({
      title: '音乐标题',
      url: '音乐URL',
      type: 'music',
      duration: 0,
    });
  };

  return (
    <div>
      <p>当前播放: {currentMusic?.title}</p>
      <p>播放状态: {playing ? '播放中' : '已暂停'}</p>
      <button onClick={() => handleToggleMusic('audio-url')}>
        {playing ? '暂停' : '播放'}
      </button>
      <button onClick={stop}>停止</button>
      <button onClick={closeMusic}>关闭音乐</button>
    </div>
  );
};
```

### MusicLibContent

完整的音乐库内容组件，包含音乐列表和播放功能。

```tsx
import { MusicLibContent } from './Music';

const MyComponent = () => {
  return <MusicLibContent value={selectedMusic} onChange={handleMusicChange} />;
};
```

### MusicList

可复用的音乐列表组件，保持与 MusicLibContent 相同的 UI 样式。

```tsx
import { MusicList } from './Music';

const MyComponent = () => {
  const musicList = [
    {
      id: 1,
      name: '音乐1',
      url: { url: 'audio-url-1' },
      cover: { url: 'cover-url-1' },
    },
    // ...更多音乐
  ];

  const handleUseMusic = item => {
    console.log('使用音乐:', item);
  };

  return (
    <MusicList
      list={musicList}
      onUseMusic={handleUseMusic}
      showActionButton={true}
      actionButtonText='选择'
    />
  );
};
```

### MusicListItem

单独的音乐列表项组件，可以在不同场景下复用。

```tsx
import { MusicListItem } from './Music';

const MyComponent = () => {
  const musicItem = {
    id: 1,
    name: '音乐名称',
    url: { url: 'audio-url' },
    cover: { url: 'cover-url' },
  };

  return (
    <MusicListItem
      item={musicItem}
      onUseMusic={item => console.log('使用音乐:', item)}
      showActionButton={true}
      actionButtonText='应用'
    />
  );
};
```

## 特性

- ✅ 异步音频加载和播放
- ✅ 播放状态管理
- ✅ 错误处理
- ✅ 防止重复点击
- ✅ 自动停止其他音乐播放
- ✅ 循环播放支持
- ✅ 播放状态样式支持
- ✅ 全局状态管理 (MusicProvider)
- ✅ 直接操作 audio 标签
- ✅ 可复用的音乐列表组件
- ✅ 统一的 UI 样式

## 注意事项

1. 音频播放需要用户交互才能开始（浏览器安全策略）
2. 确保音频URL是可访问的
3. 在组件卸载时会自动清理事件监听器
4. 使用 MusicProvider 时，需要将组件包裹在 Provider 中
