// DeepSeek API 服务模块

const API_KEY = 'sk-b281f40237c54a7bb821a8b8d464f973'
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

// 文案风格定义
export type CopywritingStyle = 
  | 'douyin_hype'      // 抖音爆款风
  | 'douyin_story'     // 抖音故事风
  | 'douyin_funny'     // 抖音搞笑风
  | 'douyin_emotional' // 抖音情感风
  | 'douyin_professional' // 抖音专业风
  | 'xiaohongshu'      // 小红书风

interface ProductInfo {
  name: string
  brand: string
  category: string
  material: string
  color: string
  size: string
  targetAudience: string
  sellingPoints?: string
}

interface CopywritingResult {
  title: string
  content: string
  hashtags: string[]
  style: CopywritingStyle
}

// 风格提示词映射
const stylePrompts: Record<CopywritingStyle, string> = {
  douyin_hype: `你是抖音电商文案专家。请根据商品信息生成抖音爆款风格的文案。
要求：
1. 标题要吸引眼球，使用emoji和夸张词汇，制造紧迫感
2. 正文要突出商品的核心卖点，使用🔥等符号标注重点
3. 内容要有感染力，让用户产生购买欲望
4. 结尾要有行动号召，如"点击下方小黄车"等
5. 使用抖音流行的表达方式`,

  douyin_story: `你是抖音电商文案专家。请根据商品信息生成抖音故事风格的文案。
要求：
1. 用讲故事的方式介绍商品，营造场景感
2. 描述使用场景和用户体验
3. 情感真挚，引发共鸣
4. 通过故事传递商品价值`,

  douyin_funny: `你是抖音电商文案专家。请根据商品信息生成抖音搞笑风格的文案。
要求：
1. 使用幽默风趣的语言，轻松活泼
2. 可以适度玩梗，增加记忆点
3. 让人会心一笑的同时记住商品
4. 用轻松的方式介绍商品卖点`,

  douyin_emotional: `你是抖音电商文案专家。请根据商品信息生成抖音情感风格的文案。
要求：
1. 触动用户情感，建立情感连接
2. 强调商品带来的情感价值和生活品质提升
3. 用温暖、治愈的语言描述
4. 让用户产生"这就是我要的"感觉`,

  douyin_professional: `你是抖音电商文案专家。请根据商品信息生成抖音专业风格的文案。
要求：
1. 客观专业地介绍商品，突出品质和性价比
2. 使用专业术语但通俗易懂
3. 强调功能特点和实用性
4. 用数据和事实说话，建立信任感`,

  xiaohongshu: `你是小红书文案专家。请根据商品信息生成小红书风格的文案。
要求：
1. 标题要有种草感，真实可信
2. 像朋友推荐一样，分享真实体验
3. 使用小红书流行的表达方式
4. 强调生活方式和品质感`,
}

// 调用 DeepSeek API 生成文案
export async function generateCopywriting(
  product: ProductInfo,
  style: CopywritingStyle = 'douyin_hype'
): Promise<CopywritingResult> {
  const systemPrompt = stylePrompts[style]
  
  const userPrompt = `请为以下商品生成文案：
商品名称：${product.name}
品牌：${product.brand}
品类：${product.category}
材质：${product.material}
颜色：${product.color}
尺寸：${product.size}
适用人群：${product.targetAudience}
${product.sellingPoints ? `卖点：${product.sellingPoints}` : ''}

请按以下JSON格式返回结果：
{
  "title": "商品标题（15-25字，要吸引眼球）",
  "content": "正文内容（200-400字），包含：\n1. 开头吸引注意\n2. 商品核心卖点（用🔥等符号标注）\n3. 使用场景描述\n4. 行动号召（引导购买）",
  "hashtags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}`

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('API 返回内容为空')
    }

    // 解析 JSON 结果
    let result: Partial<CopywritingResult>
    try {
      // 尝试直接解析
      result = JSON.parse(content)
    } catch {
      // 如果直接解析失败，尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('无法解析 API 返回内容')
      }
    }

    return {
      title: result.title || `${product.brand}${product.name}`,
      content: result.content || `${product.brand}${product.name}，${product.material}材质，适合${product.targetAudience}。`,
      hashtags: result.hashtags || ['#好物推荐', '#抖音好物', `#${product.category}`],
      style,
    }
  } catch (error) {
    console.error('生成文案失败:', error)
    // 返回默认文案
    return {
      title: `🔥${product.brand}${product.name}，${product.targetAudience}都在抢！`,
      content: `${product.targetAudience}注意了！这款${product.brand}${product.name}简直是为你们量身定制的！\n\n🔥${product.material}材质，品质绝了！\n🔥${product.color}配色，时尚百搭！\n🔥${product.size}尺码齐全，总有一款适合你！\n\n点击下方小黄车，马上拥有你的专属好物！`,
      hashtags: ['#好物推荐', '#抖音好物', `#${product.category}`, `#${product.brand}`],
      style,
    }
  }
}

// 风格名称映射（用于显示）
export const styleNames: Record<CopywritingStyle, string> = {
  douyin_hype: '爆款风格',
  douyin_story: '故事营销',
  douyin_funny: '幽默风趣',
  douyin_emotional: '情感共鸣',
  douyin_professional: '专业测评',
  xiaohongshu: '小红书风',
}

// 风格描述
export const styleDescriptions: Record<CopywritingStyle, string> = {
  douyin_hype: '抓住眼球，突出卖点，适合快速吸引流量',
  douyin_story: '通过故事讲述，增强记忆点',
  douyin_funny: '轻松幽默，增加互动和传播',
  douyin_emotional: '触动用户情感，建立品牌连接',
  douyin_professional: '客观专业，突出品质和性价比',
  xiaohongshu: '真实种草，像朋友推荐',
}
