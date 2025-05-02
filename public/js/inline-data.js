// 内联数据 - 基本示例版本
const INLINE_CONFIG = {
  sites: [
    {
      url: "https://example.com",
      description: "示例站点",
      enabled: true
    }
  ],
  settings: {
    updateInterval: 720,
    maxArticlesPerSite: 10,
    lastUpdated: new Date().toISOString()
  }
};

const INLINE_SUBSCRIPTIONS = {
  "example": {
    url: "https://example.com",
    siteName: "示例站点",
    scrapedAt: new Date().toISOString(),
    subscriptionCount: 2,
    subscriptions: [
      {
        type: "Clash",
        name: "示例订阅1",
        url: "https://example.com/sub1",
        articleTitle: "示例文章",
        articleUrl: "https://example.com/article1"
      },
      {
        type: "V2ray",
        name: "示例订阅2",
        url: "https://example.com/sub2",
        articleTitle: "示例文章",
        articleUrl: "https://example.com/article1"
      }
    ]
  }
};

const INLINE_SITES = {
  "example": {
    url: "https://example.com",
    siteName: "示例站点",
    scrapedAt: new Date().toISOString(),
    totalSubscriptions: 2,
    articles: [
      {
        title: "示例文章",
        url: "https://example.com/article1",
        publishedAt: new Date().toISOString(),
        subscriptions: [
          {
            type: "Clash",
            name: "示例订阅1",
            url: "https://example.com/sub1"
          },
          {
            type: "V2ray",
            name: "示例订阅2",
            url: "https://example.com/sub2"
          }
        ]
      }
    ]
  }
};

const REFRESH_RESPONSE = {
  success: true,
  message: '数据刷新成功！这是开发环境中的示例响应。'
}; 