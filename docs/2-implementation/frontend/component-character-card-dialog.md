角色卡弹窗

## 使用场景及样式
### oc-marker生成器生成角色后展示

|----------------------|     |--------------| ----------|
|                      |     |reate_new_icon| share_icon|  
|                      |     |--------------| ----------|
|                      |
|                      |     Using OC to Create:
|                      |     |-------------------------------------|
|      正面（立绘）     |     |[linking] | 
|      鼠标放置翻转     |     |-------------------------------------|
|                      |  
|                      |
|                      |
|----------------------| 

双面角色卡: 使用：src/components/character-detail/FlippableCharacterCard.tsx
share: (复用 @src/components/character-detail/ShareMenu.tsx)   
create_new: 重新进入/oc-maker,并清除缓存
点击卡片或者点击其他区域关闭弹窗：跳转到角色详情页 characer/{character_uuid}


### 社区列表预览
|----------------------|
|                      |                               
|                      |
|                      |
|                      |
|      正面（立绘）     |
|      鼠标放置翻转     |
|      显示角色信息卡   |
|                      |
|                      |
|                      |
|----------------------| 
|[creator_avatar]  like|
|----------------------|

双面角色卡: 使用：src/components/character-detail/FlippableCharacterCard.tsx
点击卡片跳转到 社区预览弹窗
点击其他区域关闭弹窗：跳转到角色详情页 characer/{character_uuid}

