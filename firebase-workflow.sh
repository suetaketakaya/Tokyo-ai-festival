#!/bin/bash

# Firebase特化デプロイ & マネタイゼーション統合ワークフロー
# Google AdSense アフィリエイト連携から公開まで自動化

set -e

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 設定ファイル
CONFIG_FILE=".firebase-config.json"
ADSENSE_CONFIG="adsense-config.json"
ANALYTICS_CONFIG="analytics-config.json"

# ロゴ表示
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              🔥 Firebase Deploy & Monetization 🔥            ║"
    echo "║                   Claude Code Integration                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ヘルプ表示
show_help() {
    show_banner
    echo -e "${BLUE}Firebase特化デプロイ & マネタイゼーションツール${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./firebase-workflow.sh [コマンド] [オプション]"
    echo ""
    echo "🚀 デプロイコマンド:"
    echo -e "  ${GREEN}init${NC}              新規Firebase プロジェクト初期化"
    echo -e "  ${GREEN}setup-monetization${NC} Google AdSense & アフィリエイト設定"
    echo -e "  ${GREEN}deploy${NC}            本番環境へデプロイ"
    echo -e "  ${GREEN}preview${NC}           プレビュー環境でテスト"
    echo -e "  ${GREEN}full-deploy${NC}       完全デプロイ（設定→ビルド→デプロイ→監視）"
    echo ""
    echo "💰 マネタイゼーション:"
    echo -e "  ${YELLOW}setup-adsense${NC}     Google AdSense 自動設定"
    echo -e "  ${YELLOW}setup-analytics${NC}   Google Analytics 4 連携"
    echo -e "  ${YELLOW}setup-affiliate${NC}   アフィリエイトタグ管理"
    echo -e "  ${YELLOW}optimize-seo${NC}      SEO最適化実行"
    echo ""
    echo "📊 監視・分析:"
    echo -e "  ${CYAN}status${NC}            デプロイメント状況確認"
    echo -e "  ${CYAN}analytics${NC}         収益・トラフィック分析"
    echo -e "  ${CYAN}performance${NC}       パフォーマンス監視"
    echo -e "  ${CYAN}audit${NC}             SEO・アクセシビリティ監査"
    echo ""
    echo "🔧 設定管理:"
    echo -e "  ${PURPLE}config${NC}            設定ファイル編集"
    echo -e "  ${PURPLE}backup${NC}            設定バックアップ"
    echo -e "  ${PURPLE}restore${NC}           設定復元"
}

# Firebase CLI存在確認
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}❌ Firebase CLIがインストールされていません${NC}"
        echo -e "${YELLOW}インストール方法:${NC}"
        echo "npm install -g firebase-tools"
        exit 1
    fi
    echo -e "${GREEN}✅ Firebase CLI 確認済み${NC}"
}

# 設定ファイル初期化
init_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << 'EOF'
{
  "project": {
    "id": "",
    "name": "",
    "region": "asia-northeast1"
  },
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "adsense": {
    "client_id": "",
    "auto_ads": true,
    "ad_units": []
  },
  "analytics": {
    "measurement_id": "",
    "gtag_id": ""
  },
  "seo": {
    "sitemap_url": "",
    "robots_txt": true,
    "meta_verification": {
      "google": "",
      "bing": ""
    }
  }
}
EOF
        echo -e "${GREEN}✅ 設定ファイルを作成しました: $CONFIG_FILE${NC}"
    fi
}

# Firebase プロジェクト初期化
firebase_init() {
    echo -e "${BLUE}🚀 Firebase プロジェクト初期化中...${NC}"

    check_firebase_cli
    init_config

    # Firebase ログイン確認
    if ! firebase projects:list &>/dev/null; then
        echo -e "${YELLOW}Firebase ログインが必要です${NC}"
        firebase login
    fi

    # プロジェクト選択または作成
    echo -e "${CYAN}Firebase プロジェクトを選択または作成してください:${NC}"
    firebase use --add

    # Hosting 初期化
    if [[ ! -f "firebase.json" ]]; then
        firebase init hosting
    fi

    # Functions 初期化（オプション）
    read -p "Firebase Functions を使用しますか？ (y/N): " use_functions
    if [[ "$use_functions" =~ ^[Yy]$ ]]; then
        firebase init functions
    fi

    echo -e "${GREEN}✅ Firebase 初期化完了${NC}"
}

# Google AdSense 設定
setup_adsense() {
    echo -e "${YELLOW}💰 Google AdSense 設定中...${NC}"

    read -p "AdSense クライアントID (ca-pub-xxxxxxxxx): " adsense_client
    read -p "自動広告を有効にしますか？ (Y/n): " auto_ads

    # AdSense 設定ファイル作成
    cat > "$ADSENSE_CONFIG" << EOF
{
  "client_id": "$adsense_client",
  "auto_ads": $([ "$auto_ads" != "n" ] && echo "true" || echo "false"),
  "ad_units": [
    {
      "name": "header-banner",
      "slot": "",
      "size": "728x90",
      "position": "header"
    },
    {
      "name": "sidebar-rectangle",
      "slot": "",
      "size": "300x250",
      "position": "sidebar"
    },
    {
      "name": "article-inline",
      "slot": "",
      "size": "responsive",
      "position": "article-content"
    }
  ]
}
EOF

    # AdSense タグ自動挿入
    create_adsense_integration

    echo -e "${GREEN}✅ AdSense 設定完了${NC}"
}

# AdSense 統合コード生成
create_adsense_integration() {
    local adsense_client=$(jq -r '.client_id' "$ADSENSE_CONFIG")

    cat > "src/utils/adsense.js" << EOF
// Google AdSense 統合ユーティリティ
export class AdSenseManager {
  constructor(clientId) {
    this.clientId = clientId;
    this.isLoaded = false;
  }

  // AdSense スクリプト読み込み
  async loadAdSense() {
    if (this.isLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = \`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=\${this.clientId}\`;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      script.onerror = reject;

      document.head.appendChild(script);
    });
  }

  // 広告ユニット表示
  showAd(slotId, adUnitConfig) {
    if (!this.isLoaded) {
      console.warn('AdSense not loaded yet');
      return;
    }

    const adElement = document.getElementById(slotId);
    if (!adElement) return;

    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }

  // 自動広告初期化
  initAutoAds() {
    if (!this.isLoaded) return;

    (window.adsbygoogle = window.adsbygoogle || []).push({
      google_ad_client: this.clientId,
      enable_page_level_ads: true
    });
  }
}

// デフォルトインスタンス
const adsenseManager = new AdSenseManager('$adsense_client');
export default adsenseManager;
EOF

    echo -e "${GREEN}✅ AdSense 統合コード生成完了${NC}"
}

# Google Analytics 設定
setup_analytics() {
    echo -e "${CYAN}📊 Google Analytics 4 設定中...${NC}"

    read -p "GA4 測定ID (G-xxxxxxxxx): " ga4_id
    read -p "GTM コンテナID (GTM-xxxxxxx, オプション): " gtm_id

    cat > "$ANALYTICS_CONFIG" << EOF
{
  "ga4_measurement_id": "$ga4_id",
  "gtm_container_id": "$gtm_id",
  "events": {
    "conversion_tracking": true,
    "enhanced_ecommerce": true,
    "custom_events": [
      "affiliate_click",
      "ad_impression",
      "content_engagement"
    ]
  }
}
EOF

    # Analytics 統合コード生成
    create_analytics_integration

    echo -e "${GREEN}✅ Analytics 設定完了${NC}"
}

# Analytics 統合コード生成
create_analytics_integration() {
    local ga4_id=$(jq -r '.ga4_measurement_id' "$ANALYTICS_CONFIG")
    local gtm_id=$(jq -r '.gtm_container_id' "$ANALYTICS_CONFIG")

    cat > "src/utils/analytics.js" << EOF
// Google Analytics 4 & GTM 統合
export class AnalyticsManager {
  constructor(ga4Id, gtmId = null) {
    this.ga4Id = ga4Id;
    this.gtmId = gtmId;
    this.isInitialized = false;
  }

  // GA4 初期化
  async initGA4() {
    if (this.isInitialized) return;

    // Global Site Tag (gtag.js)
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = \`https://www.googletagmanager.com/gtag/js?id=\${this.ga4Id}\`;
    document.head.appendChild(gtagScript);

    // GA4 設定
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', this.ga4Id, {
      send_page_view: true,
      anonymize_ip: true
    });

    this.isInitialized = true;
  }

  // GTM 初期化
  initGTM() {
    if (!this.gtmId) return;

    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',this.gtmId);
  }

  // カスタムイベント送信
  trackEvent(eventName, parameters = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, parameters);
    }
  }

  // アフィリエイトクリック追跡
  trackAffiliateClick(linkUrl, productName) {
    this.trackEvent('affiliate_click', {
      link_url: linkUrl,
      product_name: productName,
      value: 1
    });
  }

  // コンバージョン追跡
  trackConversion(conversionValue = 0) {
    this.trackEvent('conversion', {
      currency: 'JPY',
      value: conversionValue
    });
  }
}

// デフォルトインスタンス
const analytics = new AnalyticsManager('$ga4_id', '$gtm_id');
export default analytics;
EOF

    echo -e "${GREEN}✅ Analytics 統合コード生成完了${NC}"
}

# SEO最適化
optimize_seo() {
    echo -e "${BLUE}🔍 SEO最適化実行中...${NC}"

    # robots.txt 生成
    cat > "public/robots.txt" << 'EOF'
User-agent: *
Allow: /

Sitemap: https://yoursite.com/sitemap.xml
EOF

    # sitemap.xml 生成スクリプト
    cat > "scripts/generate-sitemap.js" << 'EOF'
const fs = require('fs');
const path = require('path');

const siteUrl = process.env.SITE_URL || 'https://yoursite.com';
const pages = [
  '',
  '/about',
  '/contact',
  '/blog'
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
  <url>
    <loc>${siteUrl}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`).join('')}
</urlset>`;

fs.writeFileSync('public/sitemap.xml', sitemap.trim());
console.log('✅ Sitemap generated');
EOF

    # package.json にスクリプト追加
    if [[ -f "package.json" ]]; then
        jq '.scripts.sitemap = "node scripts/generate-sitemap.js"' package.json > package.json.tmp
        mv package.json.tmp package.json
    fi

    echo -e "${GREEN}✅ SEO最適化完了${NC}"
}

# パフォーマンス監視設定
setup_performance_monitoring() {
    echo -e "${PURPLE}⚡ パフォーマンス監視設定中...${NC}"

    # Lighthouse CI 設定
    cat > "lighthouserc.js" << 'EOF'
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
EOF

    # Web Vitals 監視
    cat > "src/utils/webVitals.js" << 'EOF'
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
EOF

    echo -e "${GREEN}✅ パフォーマンス監視設定完了${NC}"
}

# 完全デプロイ実行
full_deploy() {
    echo -e "${BLUE}🚀 完全デプロイ実行中...${NC}"

    # プロファイル切り替え
    echo -e "${YELLOW}Firebase特化プロファイルに切り替え中...${NC}"
    ./profile-manager.sh switch firebase-deploy

    # 1. ビルド前チェック
    echo -e "${CYAN}📋 ビルド前チェック...${NC}"
    npm run lint || echo "⚠️ Lint warnings detected"

    # 2. Sitemap 生成
    npm run sitemap 2>/dev/null || node scripts/generate-sitemap.js

    # 3. ビルド実行
    echo -e "${CYAN}🔨 プロダクションビルド...${NC}"
    npm run build

    # 4. Firebase デプロイ
    echo -e "${CYAN}🚀 Firebase デプロイ...${NC}"
    firebase deploy

    # 5. デプロイ後チェック
    echo -e "${CYAN}✅ デプロイ後チェック...${NC}"
    firebase hosting:sites:list

    # 6. パフォーマンス監査
    echo -e "${CYAN}⚡ パフォーマンス監査...${NC}"
    npx lighthouse-ci autorun || echo "⚠️ Lighthouse audit completed with warnings"

    echo -e "${GREEN}🎉 完全デプロイ完了！${NC}"
    show_deploy_summary
}

# デプロイ概要表示
show_deploy_summary() {
    local project_id=$(firebase use | grep "Now using project" | awk '{print $4}' || echo "unknown")
    local site_url="https://${project_id}.web.app"

    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     🎉 デプロイ完了 🎉                       ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  サイトURL: $site_url"
    echo "║  Firebase Console: https://console.firebase.google.com/"
    echo "║  Analytics: https://analytics.google.com/"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 収益・分析レポート
analytics_report() {
    echo -e "${CYAN}📊 収益・トラフィック分析レポート${NC}"

    # Firebase Analytics データ取得（要API設定）
    echo "Firebase Analytics データを確認中..."
    firebase projects:list

    # パフォーマンス測定
    echo -e "${YELLOW}パフォーマンス測定中...${NC}"
    if command -v lighthouse &> /dev/null; then
        lighthouse --only-categories=performance --output=json --output-path=./performance-report.json $(firebase hosting:sites:list | grep -o 'https://[^[:space:]]*' | head -1) || true
    fi

    echo -e "${GREEN}✅ 分析レポート生成完了${NC}"
}

# メイン処理
main() {
    case "$1" in
        "init")
            firebase_init
            ;;
        "setup-monetization")
            setup_adsense
            setup_analytics
            ;;
        "setup-adsense")
            setup_adsense
            ;;
        "setup-analytics")
            setup_analytics
            ;;
        "optimize-seo")
            optimize_seo
            ;;
        "deploy")
            firebase deploy
            ;;
        "preview")
            firebase hosting:channel:deploy preview
            ;;
        "full-deploy")
            full_deploy
            ;;
        "status")
            firebase projects:list
            firebase hosting:sites:list
            ;;
        "analytics")
            analytics_report
            ;;
        "performance")
            setup_performance_monitoring
            ;;
        "audit")
            npx lighthouse-ci autorun
            ;;
        "config")
            nano "$CONFIG_FILE"
            ;;
        "backup")
            cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            echo -e "${GREEN}✅ 設定バックアップ完了${NC}"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            echo -e "${RED}エラー: 無効なコマンド '$1'${NC}"
            show_help
            return 1
            ;;
    esac
}

# 依存関係チェック
check_dependencies() {
    local missing_deps=()

    command -v node >/dev/null || missing_deps+=("Node.js")
    command -v npm >/dev/null || missing_deps+=("npm")
    command -v jq >/dev/null || missing_deps+=("jq")

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        echo -e "${RED}❌ 以下の依存関係が不足しています:${NC}"
        printf '%s\n' "${missing_deps[@]}"
        exit 1
    fi
}

# スクリプト実行
check_dependencies
main "$@"