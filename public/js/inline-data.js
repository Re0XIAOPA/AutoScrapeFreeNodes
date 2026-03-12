// 内联数据 - 完整测试版本

// 系统配置信息
const INLINE_CONFIG = {
  sites: [
    {
      url: "https://clashnode.github.io/",
      enabled: true,
      description: "免费节点订阅站点1"
    },
    {
      url: "https://clash-meta.github.io/",
      enabled: true,
      description: "免费节点订阅站点2"
    },
    {
      url: "https://www.airportnode.com/",
      enabled: true,
      description: "免费节点订阅站点3"
    }
  ],
  settings: {
    updateInterval: 720,
    maxArticlesPerSite: 10,
    cleanOldDataOnUpdate: true,
    port: 3001,
    dataDir: "data",
    lastUpdated: "2023-09-15T00:00:00.000Z",
    localFreeNodesCount: 13
  },
  subscriptions: [
    {
      type: "Clash",
      url: "https://sub.0664.net/clash/sub",
      name: "Clash测试订阅"
    },
    {
      type: "V2ray",
      url: "https://sub.0664.net/vmess/sub",
      name: "V2ray测试订阅"
    },
    {
      type: "Sing-Box",
      url: "https://sub.0664.net/sing-box/sub",
      name: "Sing-Box测试订阅"
    },
    {
      type: "Shadowrocket",
      url: "https://sub.0664.net/ss/sub",
      name: "Shadowrocket测试订阅"
    },
    {
      type: "Quantumult",
      url: "https://sub.0664.net/quantumult/sub",
      name: "Quantumult测试订阅"
    },
    {
      type: "SS/SSR",
      url: "https://sub.0664.net/ssr/sub",
      name: "SS/SSR测试订阅"
    },
    {
      type: "Trojan",
      url: "https://sub.0664.net/trojan/sub",
      name: "Trojan测试订阅"
    },
    {
      type: "Hysteria",
      url: "https://sub.0664.net/hysteria/sub",
      name: "Hysteria测试订阅"
    },
    {
      type: "WireGuard",
      url: "https://sub.0664.net/wireguard/sub",
      name: "WireGuard测试订阅"
    },
    {
      type: "Tuic",
      url: "https://sub.0664.net/tuic/sub",
      name: "Tuic测试订阅"
    },
    {
      type: "NaiveProxy",
      url: "https://sub.0664.net/naiveproxy/sub",
      name: "NaiveProxy测试订阅"
    },
    {
      type: "GoFlyway",
      url: "https://sub.0664.net/goflyway/sub",
      name: "GoFlyway测试订阅"
    },
    {
      type: "通用",
      url: "https://sub.0664.net/general/sub",
      name: "通用测试订阅"
    }
  ]
};

// 订阅数据
const INLINE_SUBSCRIPTIONS = {
  "clashnode": {
    url: "https://clashnode.github.io/",
    siteName: "Clash节点",
    scrapedAt: new Date().toISOString(),
    subscriptionCount: 13,
    subscriptions: [
      {
        type: "Clash",
        name: "Clash免费节点1",
        url: "https://sub.0664.net/clash/sub",
        description: "Clash免费节点订阅1"
      },
      {
        type: "V2ray",
        name: "V2ray免费节点2",
        url: "https://sub.0664.net/vmess/sub",
        description: "V2ray免费节点订阅2"
      },
      {
        type: "Sing-Box",
        name: "Sing-Box免费节点3",
        url: "https://sub.0664.net/sing-box/sub",
        description: "Sing-Box免费节点订阅3"
      },
      {
        type: "Shadowrocket",
        name: "Shadowrocket免费节点4",
        url: "https://sub.0664.net/ss/sub",
        description: "Shadowrocket免费节点订阅4"
      },
      {
        type: "Quantumult",
        name: "Quantumult免费节点5",
        url: "https://sub.0664.net/quantumult/sub",
        description: "Quantumult免费节点订阅5"
      },
      {
        type: "SS/SSR",
        name: "SS/SSR免费节点6",
        url: "https://sub.0664.net/ssr/sub",
        description: "SS/SSR免费节点订阅6"
      },
      {
        type: "Trojan",
        name: "Trojan免费节点7",
        url: "https://sub.0664.net/trojan/sub",
        description: "Trojan免费节点订阅7"
      },
      {
        type: "Hysteria",
        name: "Hysteria免费节点8",
        url: "https://sub.0664.net/hysteria/sub",
        description: "Hysteria免费节点订阅8"
      },
      {
        type: "WireGuard",
        name: "WireGuard免费节点9",
        url: "https://sub.0664.net/wireguard/sub",
        description: "WireGuard免费节点订阅9"
      },
      {
        type: "Tuic",
        name: "Tuic免费节点10",
        url: "https://sub.0664.net/tuic/sub",
        description: "Tuic免费节点订阅10"
      },
      {
        type: "NaiveProxy",
        name: "NaiveProxy免费节点11",
        url: "https://sub.0664.net/naiveproxy/sub",
        description: "NaiveProxy免费节点订阅11"
      },
      {
        type: "GoFlyway",
        name: "GoFlyway免费节点12",
        url: "https://sub.0664.net/goflyway/sub",
        description: "GoFlyway免费节点订阅12"
      },
      {
        type: "通用",
        name: "通用免费节点13",
        url: "https://sub.0664.net/general/sub",
        description: "通用免费节点订阅13"
      }
    ]
  }
};

// 站点数据
const INLINE_SITES = {
  "clashnode": {
    url: "https://clashnode.github.io/",
    siteName: "Clash节点",
    scrapedAt: new Date().toISOString(),
    totalSubscriptions: 13,
    articles: [
      {
        title: "免费节点订阅",
        url: "https://clashnode.github.io/article1",
        publishedAt: new Date().toISOString(),
        subscriptions: [
          {
            type: "Clash",
            name: "Clash免费节点1",
            url: "https://sub.0664.net/clash/sub"
          },
          {
            type: "V2ray",
            name: "V2ray免费节点2",
            url: "https://sub.0664.net/vmess/sub"
          },
          {
            type: "Sing-Box",
            name: "Sing-Box免费节点3",
            url: "https://sub.0664.net/sing-box/sub"
          },
          {
            type: "Shadowrocket",
            name: "Shadowrocket免费节点4",
            url: "https://sub.0664.net/ss/sub"
          },
          {
            type: "Quantumult",
            name: "Quantumult免费节点5",
            url: "https://sub.0664.net/quantumult/sub"
          },
          {
            type: "SS/SSR",
            name: "SS/SSR免费节点6",
            url: "https://sub.0664.net/ssr/sub"
          },
          {
            type: "Trojan",
            name: "Trojan免费节点7",
            url: "https://sub.0664.net/trojan/sub"
          },
          {
            type: "Hysteria",
            name: "Hysteria免费节点8",
            url: "https://sub.0664.net/hysteria/sub"
          },
          {
            type: "WireGuard",
            name: "WireGuard免费节点9",
            url: "https://sub.0664.net/wireguard/sub"
          },
          {
            type: "Tuic",
            name: "Tuic免费节点10",
            url: "https://sub.0664.net/tuic/sub"
          },
          {
            type: "NaiveProxy",
            name: "NaiveProxy免费节点11",
            url: "https://sub.0664.net/naiveproxy/sub"
          },
          {
            type: "GoFlyway",
            name: "GoFlyway免费节点12",
            url: "https://sub.0664.net/goflyway/sub"
          },
          {
            type: "通用",
            name: "通用免费节点13",
            url: "https://sub.0664.net/general/sub"
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