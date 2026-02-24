// SiliconFlow VLM API 服务模块 - 图生文功能

const API_KEY = 'sk-tvcgwxewwqedetirvxhiiilmfkqrkevxdnrfwhjdjlwpgrle'
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
const MODEL_NAME = 'Qwen/Qwen3-VL-8B-Instruct'

interface ImageAnalysisResult {
  description: string
  sellingPoints: string[]
  keywords: string[]
  category: string
  style: string
  targetAudience: string
}

// 将图片转换为 base64
function encodeImage(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // 移除 data:image/xxx;base64, 前缀
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })
}

// 调用 SiliconFlow API 分析图片
export async function analyzeImageForEcommerce(imageFile: File): Promise<ImageAnalysisResult> {
  const base64Image = await encodeImage(imageFile)
  
  const prompt = `请详细分析这张商品图片，并提供以下信息：

1. **商品描述**：详细描述商品的外观、材质、颜色、设计特点等
2. **卖点提炼**：列出3-5个核心卖点，突出商品优势和特色
3. **关键词**：提取5-8个适合电商搜索的关键词
4. **商品类目**：判断商品所属类目（如服装、鞋包、数码、家居等）
5. **风格特点**：描述商品的风格（如简约、复古、时尚、商务等）
6. **适用人群**：分析适合的目标用户群体

请按以下JSON格式返回结果：
{
  "description": "商品详细描述",
  "sellingPoints": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6"],
  "category": "商品类目",
  "style": "风格特点",
  "targetAudience": "适用人群"
}`

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.7,
        stream: false,
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
    let result: Partial<ImageAnalysisResult>
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
      description: result.description || '暂无描述',
      sellingPoints: result.sellingPoints || ['品质优良', '设计精美', '实用性强'],
      keywords: result.keywords || ['好物推荐', '品质生活'],
      category: result.category || '其他',
      style: result.style || '通用',
      targetAudience: result.targetAudience || '大众用户',
    }
  } catch (error) {
    console.error('图片分析失败:', error)
    throw error
  }
}

// 快速分析图片（仅返回描述）
export async function getImageCaption(imageFile: File): Promise<string> {
  const base64Image = await encodeImage(imageFile)
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请简要描述这张商品图片，包括商品类型、外观特点和风格。控制在100字以内。',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 256,
        temperature: 0.5,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || '无法识别图片内容'
  } catch (error) {
    console.error('图片识别失败:', error)
    return '图片识别失败，请重试'
  }
}

export type { ImageAnalysisResult }
