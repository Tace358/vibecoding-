import { useState, useRef, useCallback } from 'react'
import { 
  Upload, X, Copy, Check, Loader2, Sparkles, LayoutGrid, Library, 
  Package, FileSpreadsheet, History, Save, Download, FileUp,
  Trash2, Edit3, CheckCircle2, Wand2, Zap, Palette, Box,
  ChevronRight, Plus, Home, Settings,
  Clock, Award, Heart,
  Filter, Search, Grid3X3, SlidersHorizontal, RefreshCw,
  Type, ImageIcon, Layout, Palette as PaletteIcon, Monitor,
  Moon, Sun, Globe, Bell, FlaskConical, Layers, ExternalLink,
  Wand2 as MagicIcon
} from 'lucide-react'
import { 
  generateCopywriting, 
  type CopywritingStyle, 
  styleNames, 
  styleDescriptions 
} from './services/deepseek'
import {
  analyzeImageForEcommerce,
  type ImageAnalysisResult,
} from './services/siliconflow'
import {
  addProductTask,
  deleteProductTask,
  updateProductTask,
  initializeStorage,
  getProductTasks,
} from './services/storage'

// ==================== 类型定义 ====================

interface ProductInfo {
  id: string
  name: string
  brand: string
  type: string
  material: string
  color: string
  size: string
  targetAudience: string
  sellingPoints: string
  image: string | null
  referenceImages: string[]
  referenceLinks: string[]
}

interface GeneratedResult {
  id: string
  productId: string
  productName: string
  mainImage: string
  title: string
  sellingPoint: string
  selected: boolean
  savedToLibrary: boolean
  createdAt: Date
  status: 'pending' | 'generating' | 'completed' | 'failed'
  // 详细商品信息
  brand: string
  category: string
  material: string
  color: string
  size: string
  targetAudience: string
}

interface MaterialItem {
  id: string
  type: 'image' | 'text'
  content: string
  category: string
  tags: string[]
  createdAt: Date
  isFavorite: boolean
}

interface BatchProduct {
  id: number
  name: string
  brand: string
  type: string
  image: string | null
}

interface Template {
  id: string
  name: string
  category: string
  style: string
  preview: string
  isFavorite: boolean
  usageCount: number
  tags: string[]
  shopCategory: string
  createdAt: Date
}

interface Task {
  id: string
  name: string
  type: 'single' | 'batch' | 'excel'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  totalItems: number
  completedItems: number
  createdAt: Date
  completedAt?: Date
}

interface Settings {
  defaultTitleLength: number
  defaultSellingPointCount: number
  autoSaveToLibrary: boolean
  preferredStyle: string
  language: string
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
  apiKey: string
}

// ==================== 常量数据 ====================

const QUICK_ACTIONS = [
  { id: 'single', name: '单品生成', icon: Package, desc: '为单个商品生成主图和文案', color: 'from-blue-500 to-indigo-500' },
  { id: 'batch', name: '批量处理', icon: FileSpreadsheet, desc: '一次性处理多个商品', color: 'from-purple-500 to-pink-500' },
  { id: 'excel', name: 'Excel导入', icon: FileUp, desc: '从Excel文件批量导入', color: 'from-emerald-500 to-teal-500' },
]

const TITLE_TEMPLATES = [
  '【{brand}】{name} {type} {color} 新款上市 专业运动鞋',
  '{brand} {name} {type} {material}科技 {color}配色 舒适透气',
  '限时特惠 | {brand} {name} {type} {color}专业运动鞋',
  '{brand}正品 {name} {type} {material} {color} 品质保证 专业性能',
  '【{brand}】{name} {type} {color} 专业缓震 运动鞋',
  '{brand} {name} {type} {material}科技 {color} 时尚百搭 运动鞋',
]

const SELLING_POINT_TEMPLATES = [
  '✨ {material}科技，轻盈透气\n🎯 专业缓震系统，提供卓越支撑\n⚡ 时尚{color}配色，彰显运动活力',
  '💎 {brand}品质保证，专业运动性能\n🌟 {material}飞织鞋面，贴合脚型\n🔥 防滑耐磨底，适应多种场地',
  '✅ 专业运动鞋科技\n✅ 舒适透气，长时间运动不闷脚\n✅ {size}尺码齐全，完美贴合',
  '⚡ 轻量设计，步步生风\n🎯 专业缓震，减少运动伤害\n💪 耐用材质，持久性能',
  '✨ {brand}经典设计，时尚百搭\n🎯 专业运动鞋科技，提升运动表现\n🌟 高品质{material}，舒适透气',
]

const STYLE_OPTIONS = [
  { id: 'minimal', name: '简约白底', icon: Box },
  { id: 'promotion', name: '促销氛围', icon: Zap },
  { id: 'luxury', name: '高端质感', icon: Award },
  { id: 'fresh', name: '清新自然', icon: Palette },
  { id: 'tech', name: '科技未来', icon: Monitor },
  { id: 'home', name: '温馨家居', icon: Home },
]

// ==================== 主组件 ====================

function App() {
  // 页面状态
  const [currentPage, setCurrentPage] = useState<'home' | 'tasks' | 'templates' | 'library' | 'settings'>('home')
  const [inputMode, setInputMode] = useState<'single' | 'batch' | 'excel' | null>(null)
  const [showInputPanel, setShowInputPanel] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [generationMode, setGenerationMode] = useState<'default' | 'template'>('default')
  const [editingResult, setEditingResult] = useState<GeneratedResult | null>(null)
  const [showEditPanel, setShowEditPanel] = useState(false)
  
  // 商品信息状态
  const [productInfo, setProductInfo] = useState<ProductInfo>({
    id: Date.now().toString(),
    name: '',
    brand: '',
    type: '',
    material: '',
    color: '',
    size: '',
    targetAudience: '',
    sellingPoints: '',
    image: null,
    referenceImages: [],
    referenceLinks: [],
  })

  // 批量录入状态
  const [batchProducts, setBatchProducts] = useState<BatchProduct[]>([
    { id: 1, name: '', brand: '', type: '', image: null },
    { id: 2, name: '', brand: '', type: '', image: null },
    { id: 3, name: '', type: '', brand: '', image: null },
  ])

  // 生成结果状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [saveToLibrary, setSaveToLibrary] = useState(true)

  // 任务列表状态 - 从 localStorage 初始化
  const [tasks, setTasks] = useState<Task[]>(() => {
    // 从 storage 初始化数据
    const storedTasks = initializeStorage()
    // 转换为 Task 类型（兼容现有类型）
    return storedTasks.map(task => ({
      ...task,
      createdAt: new Date(task.createdAt),
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined
    }))
  })

  // 素材库状态
  const [materialLibrary, setMaterialLibrary] = useState<MaterialItem[]>([
    { id: '1', type: 'image', content: 'https://picsum.photos/400/400?random=1', category: '主图草稿', tags: ['春季新品', '连衣裙'], createdAt: new Date(Date.now() - 172800000), isFavorite: true },
    { id: '2', type: 'text', content: '【品牌A】春季新款连衣裙 棉质 粉色 M码 舒适透气 青年女性必备\n\n✨ 棉质面料，亲肤舒适\n🎯 专为青年女性设计', category: '文案', tags: ['连衣裙', '春季'], createdAt: new Date(Date.now() - 86400000), isFavorite: false },
    { id: '3', type: 'image', content: 'https://picsum.photos/400/400?random=2', category: '主图草稿', tags: ['运动鞋', '促销'], createdAt: new Date(Date.now() - 43200000), isFavorite: true },
  ])

  // 模板库状态
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', name: '简约白底', category: '通用', style: 'minimal', preview: 'from-gray-400 to-gray-600', isFavorite: true, usageCount: 128, tags: ['简约', '白底', '通用'], shopCategory: '全店通用', createdAt: new Date() },
    { id: '2', name: '促销氛围', category: '活动', style: 'promotion', preview: 'from-red-400 to-pink-500', isFavorite: false, usageCount: 86, tags: ['促销', '活动', '氛围'], shopCategory: '活动专区', createdAt: new Date() },
    { id: '3', name: '高端质感', category: '奢侈品', style: 'luxury', preview: 'from-amber-400 to-orange-500', isFavorite: true, usageCount: 45, tags: ['高端', '质感', '奢侈品'], shopCategory: '高端商品', createdAt: new Date() },
    { id: '4', name: '清新自然', category: '美妆', style: 'fresh', preview: 'from-emerald-400 to-teal-500', isFavorite: false, usageCount: 92, tags: ['清新', '自然', '美妆'], shopCategory: '美妆类目', createdAt: new Date() },
    { id: '5', name: '科技未来', category: '数码', style: 'tech', preview: 'from-blue-400 to-indigo-500', isFavorite: true, usageCount: 67, tags: ['科技', '未来', '数码'], shopCategory: '数码类目', createdAt: new Date() },
    { id: '6', name: '温馨家居', category: '家居', style: 'home', preview: 'from-rose-400 to-pink-500', isFavorite: false, usageCount: 34, tags: ['温馨', '家居', '舒适'], shopCategory: '家居类目', createdAt: new Date() },
  ])

  // 设置状态
  const [settings, setSettings] = useState<Settings>({
    defaultTitleLength: 60,
    defaultSellingPointCount: 3,
    autoSaveToLibrary: true,
    preferredStyle: 'minimal',
    language: 'zh-CN',
    theme: 'light',
    notifications: true,
    apiKey: '',
  })

  // 文件上传相关
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 参考链接输入
  const [newReferenceLink, setNewReferenceLink] = useState('')

  // 搜索和筛选
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  // 任务详情/编辑状态
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskDetail, setShowTaskDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // 任务编辑状态
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [editingTaskData, setEditingTaskData] = useState<{
    name: string
    brand: string
    category: string
    material: string
    color: string
    size: string
    targetAudience: string
    sellingPoints: string
    image: string
  }>({
    name: '',
    brand: '',
    category: '',
    material: '',
    color: '',
    size: '',
    targetAudience: '',
    sellingPoints: '',
    image: ''
  })
  const [showProductDetail, setShowProductDetail] = useState<GeneratedResult | null>(null)

  // 文案生成状态
  const [showCopywritingPanel, setShowCopywritingPanel] = useState(false)
  const [selectedCopywritingStyle, setSelectedCopywritingStyle] = useState<CopywritingStyle>('douyin_hype')
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)
  const [generatedCopywriting, setGeneratedCopywriting] = useState<{
    title: string
    content: string
    hashtags: string[]
    style: CopywritingStyle
  } | null>(null)

  // 图生文功能状态
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [imageAnalysisResult, setImageAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [showImageAnalysisPanel, setShowImageAnalysisPanel] = useState(false)

  // Toast 提示状态
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })

  // 对话历史状态
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string
    timestamp: number
    productInfo: typeof productInfo
    generatedResults: GeneratedResult[]
    copywritingResults: Array<{
      style: CopywritingStyle
      title: string
      content: string
      hashtags: string[]
    }>
  }>>([])
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)

  // ==================== 工具函数 ====================

  // 显示 Toast
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 3000)
  }, [])

  // 保存对话历史到 LocalStorage
  const saveChatHistory = useCallback((newEntry: typeof chatHistory[0]) => {
    const updatedHistory = [newEntry, ...chatHistory].slice(0, 50) // 最多保存50条
    setChatHistory(updatedHistory)
    localStorage.setItem('ecommerce_chat_history', JSON.stringify(updatedHistory))
  }, [chatHistory])

  // 从 LocalStorage 加载对话历史
  const loadChatHistory = useCallback(() => {
    const saved = localStorage.getItem('ecommerce_chat_history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setChatHistory(parsed)
      } catch (e) {
        console.error('加载历史记录失败:', e)
      }
    }
  }, [])

  // 删除单条历史记录
  const deleteChatHistoryItem = useCallback((id: string) => {
    const updatedHistory = chatHistory.filter(item => item.id !== id)
    setChatHistory(updatedHistory)
    localStorage.setItem('ecommerce_chat_history', JSON.stringify(updatedHistory))
  }, [chatHistory])

  // 导出对话历史为 JSON
  const exportChatHistory = useCallback(() => {
    const dataStr = JSON.stringify(chatHistory, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `对话历史_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('历史记录已导出', 'success')
  }, [chatHistory, showToast])

  // 页面加载时读取历史记录
  useState(() => {
    loadChatHistory()
  })

  // 在图片上添加文字信息
  const addTextToImage = useCallback((imageUrl: string, product: any): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(imageUrl)
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // 设置Canvas尺寸
        const width = img.width
        const height = img.height + 120 // 预留文字空间
        canvas.width = width
        canvas.height = height

        // 绘制图片
        ctx.drawImage(img, 0, 0, width, img.height)

        // 绘制文字背景
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, img.height, width, 120)

        // 绘制文字
        ctx.font = '16px Arial'
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'center'

        // 商品名称
        const productName = `${product.brand || ''} ${product.name}`.trim()
        ctx.font = 'bold 18px Arial'
        ctx.fillText(productName, width / 2, img.height + 30)

        // 商品类型
        const productType = product.type || ''
        if (productType) {
          ctx.font = '14px Arial'
          ctx.fillStyle = '#666666'
          ctx.fillText(productType, width / 2, img.height + 55)
        }

        // 商品材质
        const productMaterial = product.material || ''
        if (productMaterial) {
          ctx.font = '14px Arial'
          ctx.fillStyle = '#666666'
          ctx.fillText(productMaterial, width / 2, img.height + 80)
        }

        // 转换为图片URL
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      }
      img.onerror = () => {
        resolve(imageUrl)
      }
      img.src = imageUrl
    })
  }, [])

  // ==================== 处理函数 ====================

  const updateProductInfo = useCallback((field: keyof ProductInfo, value: any) => {
    setProductInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleFileSelect = useCallback((file: File, type: 'product' | 'reference', batchIndex?: number) => {
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('请上传 JPG 或 PNG 格式的图片')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      
      if (type === 'reference') {
        setProductInfo((prev) => ({
          ...prev,
          referenceImages: [...prev.referenceImages, result],
        }))
      } else if (inputMode === 'single' || selectedTask) {
        setProductInfo((prev) => ({ ...prev, image: result }))
      } else if (batchIndex !== undefined) {
        setBatchProducts((prev) =>
          prev.map((p, i) => (i === batchIndex ? { ...p, image: result } : p))
        )
      }
    }
    reader.readAsDataURL(file)
  }, [inputMode, selectedTask])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, type: 'product' | 'reference', batchIndex?: number) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file, type, batchIndex)
    }
  }, [handleFileSelect])

  const handleRemoveImage = useCallback((type: 'product' | 'reference', index?: number) => {
    if (type === 'reference' && index !== undefined) {
      setProductInfo((prev) => ({
        ...prev,
        referenceImages: prev.referenceImages.filter((_, i) => i !== index),
      }))
    } else if (inputMode === 'single' || selectedTask) {
      setProductInfo((prev) => ({ ...prev, image: null }))
    } else if (index !== undefined) {
      setBatchProducts((prev) =>
        prev.map((p, i) => (i === index ? { ...p, image: null } : p))
      )
    }
  }, [inputMode, selectedTask])

  const addReferenceLink = useCallback(() => {
    if (!newReferenceLink.trim()) return
    if (!newReferenceLink.startsWith('http')) {
      alert('请输入有效的链接地址')
      return
    }
    setProductInfo((prev) => ({
      ...prev,
      referenceLinks: [...prev.referenceLinks, newReferenceLink.trim()],
    }))
    setNewReferenceLink('')
  }, [newReferenceLink])

  const removeReferenceLink = useCallback((index: number) => {
    setProductInfo((prev) => ({
      ...prev,
      referenceLinks: prev.referenceLinks.filter((_, i) => i !== index),
    }))
  }, [])

  const updateBatchProduct = useCallback((index: number, field: keyof BatchProduct, value: string) => {
    setBatchProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }, [])

  const addBatchRow = useCallback(() => {
    setBatchProducts((prev) => [
      ...prev,
      { id: prev.length + 1, name: '', brand: '', type: '', image: null },
    ])
  }, [])

  const removeBatchRow = useCallback((index: number) => {
    setBatchProducts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleExcelImport = useCallback((file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('请上传 Excel 文件 (.xlsx 或 .xls)')
      return
    }
    
    const mockData = [
      { id: 1, name: '示例商品1', brand: '品牌A', type: '服装', image: null },
      { id: 2, name: '示例商品2', brand: '品牌B', type: '鞋履', image: null },
      { id: 3, name: '示例商品3', brand: '品牌C', type: '配饰', image: null },
    ]
    
    setBatchProducts(mockData)
    alert(`成功导入 ${mockData.length} 条商品数据，请补充上传图片`)
  }, [])

  const handleGenerate = useCallback(async () => {
    let productsToGenerate: Array<{ name: string; brand: string; type: string; material: string; color: string; size: string; targetAudience: string; image: string | null }> = []

    if (inputMode === 'single') {
      if (!productInfo.name.trim()) {
        alert('请输入商品名称')
        return
      }
      if (!productInfo.image) {
        alert('请上传商品图片')
        return
      }
      productsToGenerate = [productInfo]
    } else {
      const validProducts = batchProducts.filter((p) => p.name.trim() && p.image)
      if (validProducts.length === 0) {
        alert('请至少填写一个有效的商品信息')
        return
      }
      productsToGenerate = validProducts.map(p => ({
        ...p,
        material: '优质面料',
        color: '经典色',
        size: '均码',
        targetAudience: '通用'
      }))
    }

    setIsGenerating(true)
    setHasGenerated(false)

    // 创建任务 - 使用 storage 服务
    const storageTask = addProductTask({
      name: inputMode === 'single' ? productInfo.name : `批量任务-${batchProducts.filter(p => p.name).length}个商品`,
      type: inputMode || 'single',
      status: 'processing',
      progress: 0,
      totalItems: productsToGenerate.length,
      completedItems: 0,
    })
    
    // 转换为 Task 类型
    const newTask: Task = {
      ...storageTask,
      createdAt: new Date(storageTask.createdAt),
      completedAt: storageTask.completedAt ? new Date(storageTask.completedAt) : undefined
    }
    setTasks(prev => [newTask, ...prev])

    // 模拟真实的生成过程
    const totalSteps = productsToGenerate.length * 3 // 每个商品3个步骤
    let currentStep = 0

    const updateProgress = () => {
      currentStep++
      const progress = Math.min(Math.round((currentStep / totalSteps) * 100), 100)
      const completedItems = Math.min(Math.floor(currentStep / 3), productsToGenerate.length)
      
      setTasks(prev => prev.map(t => 
        t.id === newTask.id 
          ? { ...t, progress, completedItems }
          : t
      ))
    }

    const processGeneration = async () => {
      for (let i = 0; i < productsToGenerate.length; i++) {
        // 步骤1: 分析商品信息
        updateProgress()
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 步骤2: 生成主图
        updateProgress()
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 步骤3: 编写文案
        updateProgress()
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 生成最终结果
      const processResults = async () => {
        const results: GeneratedResult[] = []
        const newMaterials: MaterialItem[] = []
        const newTemplates: Template[] = []

        for (let i = 0; i < productsToGenerate.length; i++) {
          const product = productsToGenerate[i]
          
          // 根据生成模式选择模板
          let titleTemplate, sellingPointTemplate
          if (generationMode === 'template' && selectedTemplate) {
            // 使用选中的模板（这里简化处理，实际应该根据模板ID获取对应的模板配置）
            titleTemplate = TITLE_TEMPLATES[0] // 假设使用第一个模板
            sellingPointTemplate = SELLING_POINT_TEMPLATES[0] // 假设使用第一个模板
          } else {
            // 使用系统默认逻辑
            titleTemplate = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)]
            sellingPointTemplate = SELLING_POINT_TEMPLATES[Math.floor(Math.random() * SELLING_POINT_TEMPLATES.length)]
          }
          
          // 生成基础版本
          const title = titleTemplate
            .replace('{brand}', product.brand || '品牌')
            .replace('{name}', product.name)
            .replace('{type}', product.type || '')
            .replace('{material}', product.material || '')
            .replace('{color}', product.color || '')
            .replace('{size}', product.size || '')
            .replace('{targetAudience}', product.targetAudience || '')
            .replace(/\s+/g, ' ')
            .trim()
          
          const sellingPoint = sellingPointTemplate
            .replace('{brand}', product.brand || '品牌')
            .replace('{material}', product.material || '优质')
            .replace('{targetAudience}', product.targetAudience || '大众')
            .replace('{color}', product.color || '经典')
            .replace('{type}', product.type || '商品')
            .replace('{size}', product.size || '全尺码')

          // 处理图片，添加文字信息
          // 如果没有上传图片，使用占位符
          const imageToProcess = product.image || ''
          const processedImage = imageToProcess 
            ? await addTextToImage(imageToProcess, product)
            : ''

          // 添加基础版本结果
          const baseResult: GeneratedResult = {
            id: `result-${Date.now()}-${i}-base`,
            productId: inputMode === 'single' ? productInfo.id : `batch-${i}`,
            productName: product.name,
            mainImage: processedImage,
            title: title.slice(0, settings.defaultTitleLength),
            sellingPoint,
            selected: false,
            savedToLibrary: false,
            createdAt: new Date(),
            status: 'completed',
            // 添加详细商品信息
            brand: product.brand || '',
            category: product.type || '',
            material: product.material || '',
            color: product.color || '',
            size: product.size || '',
            targetAudience: product.targetAudience || '',
          }
          results.push(baseResult)

          // 为单品模式生成A/B测试变体
          if (inputMode === 'single') {
            // 生成变体1: 不同的标题模板
            const variant1TitleTemplate = TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)]
            const variant1Title = variant1TitleTemplate
              .replace('{brand}', product.brand || '品牌')
              .replace('{name}', product.name)
              .replace('{type}', product.type || '')
              .replace('{material}', product.material || '')
              .replace('{color}', product.color || '')
              .replace('{size}', product.size || '')
              .replace('{targetAudience}', product.targetAudience || '')
              .replace(/\s+/g, ' ')
              .trim()

            const variant1: GeneratedResult = {
              id: `result-${Date.now()}-${i}-variant1`,
              productId: inputMode === 'single' ? productInfo.id : `batch-${i}`,
              productName: `${product.name} (变体1)`,
              mainImage: processedImage,
              title: variant1Title.slice(0, settings.defaultTitleLength),
              sellingPoint,
              selected: false,
              savedToLibrary: false,
              createdAt: new Date(),
              status: 'completed',
              // 添加详细商品信息
              brand: product.brand || '',
              category: product.type || '',
              material: product.material || '',
              color: product.color || '',
              size: product.size || '',
              targetAudience: product.targetAudience || '',
            }
            results.push(variant1)

            // 生成变体2: 不同的卖点模板
            const variant2SellingPointTemplate = SELLING_POINT_TEMPLATES[Math.floor(Math.random() * SELLING_POINT_TEMPLATES.length)]
            const variant2SellingPoint = variant2SellingPointTemplate
              .replace('{brand}', product.brand || '品牌')
              .replace('{material}', product.material || '优质')
              .replace('{targetAudience}', product.targetAudience || '大众')
              .replace('{color}', product.color || '经典')
              .replace('{type}', product.type || '商品')
              .replace('{size}', product.size || '全尺码')

            const variant2: GeneratedResult = {
              id: `result-${Date.now()}-${i}-variant2`,
              productId: inputMode === 'single' ? productInfo.id : `batch-${i}`,
              productName: `${product.name} (变体2)`,
              mainImage: processedImage,
              title: title.slice(0, settings.defaultTitleLength),
              sellingPoint: variant2SellingPoint,
              selected: false,
              savedToLibrary: false,
              createdAt: new Date(),
              status: 'completed',
              // 添加详细商品信息
              brand: product.brand || '',
              category: product.type || '',
              material: product.material || '',
              color: product.color || '',
              size: product.size || '',
              targetAudience: product.targetAudience || '',
            }
            results.push(variant2)
          }

          // 添加到素材库
          results.forEach(result => {
            newMaterials.push(
              {
                id: `mat-img-${result.id}`,
                type: 'image',
                content: result.mainImage,
                category: '主图草稿',
                tags: [result.productName, '自动生成'],
                createdAt: new Date(),
                isFavorite: false,
              },
              {
                id: `mat-text-${result.id}`,
                type: 'text',
                content: `${result.title}\n\n${result.sellingPoint}`,
                category: '文案',
                tags: [result.productName, '标题', '卖点'],
                createdAt: new Date(),
                isFavorite: false,
              }
            )
          })

          // 添加到模板库（仅单品模式）
          if (inputMode === 'single') {
            newTemplates.push({
              id: `template-${Date.now()}-${i}`,
              name: `${product.brand || '品牌'} ${product.name}`,
              category: product.type || '通用',
              style: 'minimal',
              preview: 'from-gray-400 to-gray-600',
              isFavorite: false,
              usageCount: 0,
              tags: [product.name, product.brand || '品牌', product.type || '通用'],
              shopCategory: '全店通用',
              createdAt: new Date(),
            })
          }
        }

        setGeneratedResults(results)
        setIsGenerating(false)
        setHasGenerated(true)
        setShowInputPanel(false)

        // 更新任务状态为已完成 - 同步到 localStorage
        const completedTask = { 
          ...newTask, 
          status: 'completed' as const, 
          progress: 100, 
          completedItems: newTask.totalItems, 
          completedAt: new Date() 
        }
        setTasks(prev => prev.map(t => 
          t.id === newTask.id ? completedTask : t
        ))
        // 同步更新 localStorage
        updateProductTask(newTask.id, {
          status: 'completed',
          progress: 100,
          completedItems: newTask.totalItems,
          completedAt: new Date().toISOString()
        })

        // 更新素材库
        if (newMaterials.length > 0) {
          setMaterialLibrary(prev => [...newMaterials, ...prev])
          setGeneratedResults(prev => 
            prev.map(r => ({ ...r, savedToLibrary: true }))
          )
        }

        // 更新模板库
        if (newTemplates.length > 0) {
          setTemplates(prev => [...newTemplates, ...prev])
        }
      }

      processResults()
    }

    // 开始生成过程
    try {
      await processGeneration()
      
      // 保存到历史记录
      const historyEntry = {
        id: `chat-${Date.now()}`,
        timestamp: Date.now(),
        productInfo: { ...productInfo },
        generatedResults: generatedResults,
        copywritingResults: [],
      }
      saveChatHistory(historyEntry)
      
      showToast('生成成功！', 'success')
    } catch (error) {
      console.error('生成失败:', error)
      setIsGenerating(false)
      setTasks(prev => prev.map(t => 
        t.id === newTask.id 
          ? { ...t, status: 'failed' }
          : t
      ))
      showToast('生成失败，请稍后重试', 'error')
    }
  }, [inputMode, productInfo, batchProducts, saveToLibrary, settings, generationMode, selectedTemplate, generatedResults, saveChatHistory, showToast])

  const handleSelectResult = useCallback((id: string) => {
    setGeneratedResults((prev) =>
      prev.map((r) => ({ ...r, selected: r.id === id }))
    )
  }, [])

  const handleCopyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [])

  // 生成文案
  const handleGenerateCopywriting = useCallback(async () => {
    if (!showProductDetail) return
    
    setIsGeneratingCopy(true)
    try {
      const result = await generateCopywriting({
        name: showProductDetail.productName,
        brand: showProductDetail.brand,
        category: showProductDetail.category,
        material: showProductDetail.material,
        color: showProductDetail.color,
        size: showProductDetail.size,
        targetAudience: showProductDetail.targetAudience,
      }, selectedCopywritingStyle)
      
      setGeneratedCopywriting(result)
      showToast('文案生成成功！', 'success')
    } catch (error) {
      console.error('生成文案失败:', error)
      showToast('生成失败，请稍后重试', 'error')
    } finally {
      setIsGeneratingCopy(false)
    }
  }, [showProductDetail, selectedCopywritingStyle, showToast])

  // 应用生成的文案到商品
  const handleApplyCopywriting = useCallback(() => {
    if (!generatedCopywriting || !showProductDetail) return
    
    // 更新商品信息
    setGeneratedResults(prev => prev.map(r => 
      r.id === showProductDetail.id 
        ? { 
            ...r, 
            title: generatedCopywriting.title,
            sellingPoint: generatedCopywriting.content
          } 
        : r
    ))
    
    // 更新当前显示的商品详情
    setShowProductDetail(prev => prev ? {
      ...prev,
      title: generatedCopywriting.title,
      sellingPoint: generatedCopywriting.content
    } : null)
    
    alert('文案已应用')
    setShowCopywritingPanel(false)
    setGeneratedCopywriting(null)
  }, [generatedCopywriting, showProductDetail])

  // 图生文：分析图片生成卖点和关键词
  const handleAnalyzeImage = useCallback(async (imageFile: File) => {
    setIsAnalyzingImage(true)
    setShowImageAnalysisPanel(true)
    
    try {
      const result = await analyzeImageForEcommerce(imageFile)
      setImageAnalysisResult(result)
    } catch (error) {
      console.error('图片分析失败:', error)
      alert('图片分析失败，请重试')
    } finally {
      setIsAnalyzingImage(false)
    }
  }, [])

  // 应用图片分析结果到商品
  const handleApplyImageAnalysis = useCallback(() => {
    if (!imageAnalysisResult) return
    
    // 更新商品信息
    setProductInfo(prev => ({
      ...prev,
      name: prev.name || imageAnalysisResult.description.slice(0, 30),
      category: imageAnalysisResult.category,
      material: prev.material || imageAnalysisResult.style,
      targetAudience: imageAnalysisResult.targetAudience,
      sellingPoints: imageAnalysisResult.sellingPoints.join('\n'),
    }))
    
    alert('分析结果已应用到商品信息')
    setShowImageAnalysisPanel(false)
    setImageAnalysisResult(null)
  }, [imageAnalysisResult])

  const handleEditResult = useCallback((result: GeneratedResult) => {
    setEditingResult(result)
    setShowEditPanel(true)
  }, [])

  const handleUpdateResult = useCallback((updates: Partial<GeneratedResult>) => {
    if (!editingResult) return
    
    setGeneratedResults(prev => prev.map(r => 
      r.id === editingResult.id ? { ...r, ...updates } : r
    ))
    setEditingResult(prev => prev ? { ...prev, ...updates } : null)
  }, [editingResult])

  const handleSaveEdit = useCallback(() => {
    setShowEditPanel(false)
    setEditingResult(null)
  }, [])

  const handleExport = useCallback(async () => {
    const selectedResults = generatedResults.filter(r => r.selected)
    if (selectedResults.length === 0) {
      alert('请先选择要导出的内容')
      return
    }
    
    try {
      // 1. 导出为JSON文件
      const exportData = selectedResults.map(r => ({
        商品名称: r.productName,
        商品ID: r.productId,
        主图: r.mainImage,
        标题: r.title,
        卖点: r.sellingPoint,
        商品链接: `【请替换为真实商品链接】`,
      }))
      
      const jsonContent = JSON.stringify(exportData, null, 2)
      const jsonBlob = new Blob([jsonContent], { type: 'application/json' })
      const jsonUrl = URL.createObjectURL(jsonBlob)
      const jsonLink = document.createElement('a')
      jsonLink.href = jsonUrl
      jsonLink.download = `商品导出_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(jsonLink)
      jsonLink.click()
      document.body.removeChild(jsonLink)
      URL.revokeObjectURL(jsonUrl)
      
      // 2. 导出为CSV文件
      const csvHeader = '商品名称,商品ID,标题,卖点,商品链接\n'
      const csvContent = selectedResults.map(r => {
        return [
          r.productName,
          r.productId,
          r.title,
          r.sellingPoint.replace(/\n/g, ' '),
          `【请替换为真实商品链接】`,
        ].map(field => `"${field}"`).join(',')
      }).join('\n')
      
      const csvBlob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' })
      const csvUrl = URL.createObjectURL(csvBlob)
      const csvLink = document.createElement('a')
      csvLink.href = csvUrl
      csvLink.download = `商品导出_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(csvLink)
      csvLink.click()
      document.body.removeChild(csvLink)
      URL.revokeObjectURL(csvUrl)
      
      // 3. 提示用户保存图片
      if (selectedResults.some(r => r.mainImage)) {
        alert(`已成功导出 ${selectedResults.length} 个商品的信息\n\n提示：请右键点击生成的图片并选择"保存图片"来保存商品主图`)
      } else {
        alert(`已成功导出 ${selectedResults.length} 个商品的信息`)
      }
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出过程中发生错误，请重试')
    }
  }, [generatedResults])

  const toggleTemplateFavorite = useCallback((templateId: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    ))
  }, [])

  const toggleMaterialFavorite = useCallback((materialId: string) => {
    setMaterialLibrary(prev => prev.map(m => 
      m.id === materialId ? { ...m, isFavorite: !m.isFavorite } : m
    ))
  }, [])

  const deleteMaterial = useCallback((materialId: string) => {
    setMaterialLibrary(prev => prev.filter(m => m.id !== materialId))
  }, [])

  const deleteTask = useCallback((taskId: string) => {
    // 从 localStorage 删除
    deleteProductTask(taskId)
    // 更新状态
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  // 开始编辑任务
  const startEditTask = useCallback(() => {
    if (!selectedTask) return
    
    // 从 storage 获取完整的任务数据
    const storageTasks = getProductTasks()
    const fullTask = storageTasks.find(t => t.id === selectedTask.id)
    
    if (fullTask?.product) {
      setEditingTaskData({
        name: fullTask.product.basicInfo.name || '',
        brand: fullTask.product.basicInfo.brand || '',
        category: fullTask.product.basicInfo.category || '',
        material: fullTask.product.basicInfo.material || '',
        color: fullTask.product.basicInfo.color || '',
        size: fullTask.product.basicInfo.size || '',
        targetAudience: fullTask.product.basicInfo.targetAudience || '',
        sellingPoints: fullTask.product.basicInfo.sellingPoints || '',
        image: fullTask.product.inputAssets.productImages[0]?.url || ''
      })
    } else {
      // 如果没有完整数据，使用默认值
      setEditingTaskData({
        name: selectedTask.name || '',
        brand: '',
        category: '',
        material: '',
        color: '',
        size: '',
        targetAudience: '',
        sellingPoints: '',
        image: ''
      })
    }
    setIsEditingTask(true)
  }, [selectedTask])

  // 保存编辑的任务
  const saveEditingTask = useCallback(() => {
    if (!selectedTask) return
    
    setIsSaving(true)
    
    // 更新 storage
    updateProductTask(selectedTask.id, {
      name: editingTaskData.name,
      product: {
        basicInfo: {
          name: editingTaskData.name,
          brand: editingTaskData.brand,
          category: editingTaskData.category,
          material: editingTaskData.material,
          color: editingTaskData.color,
          size: editingTaskData.size,
          targetAudience: editingTaskData.targetAudience,
          sellingPoints: editingTaskData.sellingPoints
        },
        inputAssets: {
          productImages: editingTaskData.image 
            ? [{ id: `img_${Date.now()}`, url: editingTaskData.image, type: 'main' }]
            : []
        }
      }
    })
    
    // 更新本地状态
    setTasks(prev => prev.map(t => 
      t.id === selectedTask.id 
        ? { ...t, name: editingTaskData.name }
        : t
    ))
    
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setIsEditingTask(false)
      showToast('保存成功！', 'success')
      setTimeout(() => setSaveSuccess(false), 2000)
    }, 500)
  }, [selectedTask, editingTaskData, showToast])

  const retryTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'processing', progress: 0 } : t
    ))
    setTimeout(() => {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed', progress: 100, completedItems: t.totalItems } : t
      ))
    }, 2000)
  }, [])

  const updateSettings = useCallback((key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // ==================== 渲染函数 ====================

  const renderSidebar = () => (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col gap-1">
        <button
          onClick={() => setCurrentPage('home')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentPage === 'home' 
              ? 'bg-indigo-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
          title="首页"
        >
          <Home className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPage('tasks')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentPage === 'tasks' 
              ? 'bg-indigo-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
          title="任务列表"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPage('templates')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentPage === 'templates' 
              ? 'bg-indigo-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
          title="模板库"
        >
          <Palette className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPage('library')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentPage === 'library' 
              ? 'bg-indigo-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
          title="素材库"
        >
          <Library className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPage('settings')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
            currentPage === 'settings' 
              ? 'bg-indigo-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  const renderHome = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* 欢迎区域 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI 电商图文生成助手</h1>
              <p className="text-white/80">让商品主图和文案创作变得简单高效</p>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => { setCurrentPage('tasks'); setShowInputPanel(true); setInputMode('single') }}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-white/90 transition flex items-center gap-2"
            >
              <Wand2 className="w-5 h-5" />
              开始创作
            </button>
            <button
              onClick={() => setCurrentPage('templates')}
              className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl font-medium hover:bg-white/30 transition flex items-center gap-2"
            >
              <Library className="w-5 h-5" />
              浏览模板
            </button>
          </div>
        </div>
      </div>

      {/* 测试数据入口 - 全流程测试 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-600" />
            测试数据入口（一键测试全流程）
          </h2>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">开发测试用</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => {
              // 测试场景1：单品生成完整流程
              const newTask: Task = {
                id: Date.now().toString(),
                name: '测试-夏季连衣裙单品',
                type: 'single',
                status: 'processing',
                progress: 30,
                totalItems: 1,
                completedItems: 0,
                createdAt: new Date(),
              }
              setTasks(prev => [newTask, ...prev])
              setSelectedTask(newTask)
              setShowTaskDetail(true)
              setProductInfo({
                id: Date.now().toString(),
                name: '夏季碎花连衣裙',
                brand: '花语',
                type: 'clothing',
                material: '雪纺',
                color: '粉色/蓝色/白色',
                size: 'S/M/L/XL/XXL',
                targetAudience: '18-35岁女性',
                sellingPoints: '轻盈透气，显瘦修身，法式浪漫风格',
                image: 'https://picsum.photos/400/400?random=test1',
                referenceImages: ['https://picsum.photos/200/200?random=ref1'],
                referenceLinks: ['https://example.com/best-seller-1'],
              })
              alert('已创建测试任务：夏季连衣裙单品生成（处理中）\n\n包含：\n• 完整商品信息（名称、品牌、材质等）\n• 商品图片\n• 参考爆款截图\n• 参考链接')
            }}
            className="p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <p className="font-medium text-gray-900 text-sm">测试单品生成</p>
            <p className="text-xs text-gray-500 mt-1">含完整商品信息+参考物</p>
          </button>

          <button
            onClick={() => {
              // 测试场景2：批量生成
              const newTask: Task = {
                id: Date.now().toString(),
                name: '测试-春季新品批量',
                type: 'batch',
                status: 'processing',
                progress: 45,
                totalItems: 5,
                completedItems: 2,
                createdAt: new Date(),
              }
              setTasks(prev => [newTask, ...prev])
              setBatchProducts([
                { id: 1, name: '春季风衣外套', brand: '都市风尚', type: 'clothing', image: 'https://picsum.photos/100/100?random=b1' },
                { id: 2, name: '休闲牛仔裤', brand: '牛仔世家', type: 'clothing', image: 'https://picsum.photos/100/100?random=b2' },
                { id: 3, name: '针织开衫', brand: '温暖织语', type: 'clothing', image: null },
                { id: 4, name: '印花T恤', brand: '潮流前线', type: 'clothing', image: null },
                { id: 5, name: '运动套装', brand: '活力运动', type: 'clothing', image: null },
              ])
              setSelectedTask(newTask)
              setShowTaskDetail(true)
              alert('已创建测试任务：春季新品批量生成（5个商品）\n\n包含：\n• 5个商品信息\n• 部分已上传图片\n• 批量处理中状态')
            }}
            className="p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <p className="font-medium text-gray-900 text-sm">测试批量生成</p>
            <p className="text-xs text-gray-500 mt-1">5个商品批量处理</p>
          </button>

          <button
            onClick={() => {
              // 测试场景3：Excel导入
              const newTask: Task = {
                id: Date.now().toString(),
                name: '测试-Excel批量导入',
                type: 'excel',
                status: 'pending',
                progress: 0,
                totalItems: 20,
                completedItems: 0,
                createdAt: new Date(),
              }
              setTasks(prev => [newTask, ...prev])
              setSelectedTask(newTask)
              setShowTaskDetail(true)
              alert('已创建测试任务：Excel批量导入（等待中）\n\n包含：\n• 20个商品数据\n• 等待处理状态\n• 可点击"开始处理"')
            }}
            className="p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <p className="font-medium text-gray-900 text-sm">测试Excel导入</p>
            <p className="text-xs text-gray-500 mt-1">20个商品等待处理</p>
          </button>

          <button
            onClick={() => {
              // 测试场景4：已完成任务（带结果）
              const newTask: Task = {
                id: Date.now().toString(),
                name: '测试-已完成任务',
                type: 'batch',
                status: 'completed',
                progress: 100,
                totalItems: 3,
                completedItems: 3,
                createdAt: new Date(Date.now() - 86400000),
                completedAt: new Date(),
              }
              const mockResults: GeneratedResult[] = [
                {
                  id: `test-result-1`,
                  productId: 'p1',
                  productName: '测试商品-时尚手提包',
                  mainImage: `https://picsum.photos/400/400?random=done1`,
                  title: '【轻奢品牌】时尚手提包 真皮材质 大容量 通勤必备 2024新款',
                  sellingPoint: '✨ 头层牛皮，质感细腻\n🎯 大容量设计，轻松收纳\n💼 通勤约会两相宜',
                  selected: false,
                  savedToLibrary: true,
                  createdAt: new Date(),
                  status: 'completed',
                  brand: '轻奢品牌',
                  category: '手提包',
                  material: '真皮',
                  color: '棕色',
                  size: '中号',
                  targetAudience: '职场女性',
                },
                {
                  id: `test-result-2`,
                  productId: 'p2',
                  productName: '测试商品-休闲运动鞋',
                  mainImage: `https://picsum.photos/400/400?random=done2`,
                  title: '【运动品牌】透气休闲鞋 轻便舒适 跑步健身 潮流百搭',
                  sellingPoint: '✨ 透气网面，清爽不闷脚\n🏃 轻量设计，运动无负担\n👟 多色可选，百搭时尚',
                  selected: true,
                  savedToLibrary: true,
                  createdAt: new Date(),
                  status: 'completed',
                  brand: '运动品牌',
                  category: '运动鞋',
                  material: '网面',
                  color: '白色',
                  size: '42码',
                  targetAudience: '运动爱好者',
                },
                {
                  id: `test-result-3`,
                  productId: 'p3',
                  productName: '测试商品-防晒衣',
                  mainImage: `https://picsum.photos/400/400?random=done3`,
                  title: '【户外品牌】UPF50+防晒衣 轻薄透气 户外必备 夏季新款',
                  sellingPoint: '☀️ UPF50+有效阻隔紫外线\n🌬️ 轻薄透气，穿着舒适\n🏕️ 户外旅行必备单品',
                  selected: false,
                  savedToLibrary: true,
                  createdAt: new Date(),
                  status: 'completed',
                  brand: '户外品牌',
                  category: '防晒衣',
                  material: '尼龙',
                  color: '浅灰',
                  size: 'L',
                  targetAudience: '户外爱好者',
                },
              ]
              setTasks(prev => [newTask, ...prev])
              setGeneratedResults(mockResults)
              setSelectedTask(newTask)
              setShowTaskDetail(true)
              alert('已创建测试任务：已完成任务（可直接查看结果）\n\n包含：\n• 3个已生成商品\n• 主图+标题+卖点\n• 可直接导出')
            }}
            className="p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-400 hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="font-medium text-gray-900 text-sm">测试已完成任务</p>
            <p className="text-xs text-gray-500 mt-1">含生成结果可导出</p>
          </button>
        </div>

        {/* 快速填充按钮 */}
        <div className="mt-4 pt-4 border-t border-amber-200">
          <p className="text-sm text-gray-600 mb-3">快速填充测试数据：</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setProductInfo({
                  id: Date.now().toString(),
                  name: '法式复古碎花连衣裙',
                  brand: '巴黎花语',
                  type: 'clothing',
                  material: '高档雪纺',
                  color: '樱花粉/天空蓝/珍珠白',
                  size: 'S/M/L/XL',
                  targetAudience: '25-40岁都市女性',
                  sellingPoints: '法式浪漫设计，显瘦剪裁，透气舒适，适合约会/通勤/度假多种场合',
                  image: 'https://picsum.photos/400/400?random=dress',
                  referenceImages: ['https://picsum.photos/200/200?random=ref1', 'https://picsum.photos/200/200?random=ref2'],
                  referenceLinks: ['https://example.com/popular-dress', 'https://example.com/best-seller'],
                })
                setSaveToLibrary(true)
                setCurrentPage('tasks')
                setShowInputPanel(true)
                setInputMode('single')
                alert('已填充完整商品数据！\n\n包含：\n• 商品名称、品牌、材质等完整信息\n• 商品图片\n• 2张参考爆款图\n• 2个参考链接\n• 已勾选保存到素材库')
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              填充完整单品数据
            </button>
            <button
              onClick={() => {
                setBatchProducts([
                  { id: 1, name: '纯棉T恤', brand: '基础款', type: 'clothing', image: 'https://picsum.photos/100/100?random=t1' },
                  { id: 2, name: '牛仔裤', brand: '牛仔专家', type: 'clothing', image: 'https://picsum.photos/100/100?random=t2' },
                  { id: 3, name: '运动短裤', brand: '活力运动', type: 'clothing', image: 'https://picsum.photos/100/100?random=t3' },
                  { id: 4, name: '防晒外套', brand: '户外探索', type: 'clothing', image: null },
                  { id: 5, name: '休闲衬衫', brand: '商务休闲', type: 'clothing', image: null },
                  { id: 6, name: '针织毛衣', brand: '温暖冬日', type: 'clothing', image: null },
                ])
                setCurrentPage('tasks')
                setShowInputPanel(true)
                setInputMode('batch')
                alert('已填充批量商品数据！\n\n包含：\n• 6个商品信息\n• 部分已上传图片\n• 可直接点击生成')
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              填充批量商品数据
            </button>
            <button
              onClick={() => {
                // 清空所有数据，重新开始
                setProductInfo({
                  id: Date.now().toString(),
                  name: '',
                  brand: '',
                  type: '',
                  material: '',
                  color: '',
                  size: '',
                  targetAudience: '',
                  sellingPoints: '',
                  image: null,
                  referenceImages: [],
                  referenceLinks: [],
                })
                setBatchProducts([
                  { id: 1, name: '', brand: '', type: '', image: null },
                  { id: 2, name: '', brand: '', type: '', image: null },
                  { id: 3, name: '', type: '', brand: '', image: null },
                ])
                setGeneratedResults([])
                setHasGenerated(false)
                alert('已清空所有数据，可以重新开始测试')
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              清空数据
            </button>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          快捷操作
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => { 
                setCurrentPage('tasks'); 
                setShowInputPanel(true); 
                setInputMode(action.id as 'single' | 'batch' | 'excel') 
              }}
              className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.name}</h3>
              <p className="text-sm text-gray-500">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.status === 'completed').length}</p>
          <p className="text-sm text-gray-500">已完成任务</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-gray-500">进行中</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.status === 'processing').length}</p>
          <p className="text-sm text-gray-500">处理中任务</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+5</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{materialLibrary.filter(m => m.type === 'image').length}</p>
          <p className="text-sm text-gray-500">主图素材</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
              <Type className="w-5 h-5 text-pink-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+8</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{materialLibrary.filter(m => m.type === 'text').length}</p>
          <p className="text-sm text-gray-500">文案素材</p>
        </div>
      </div>

      {/* 最近任务 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            最近任务
          </h2>
          <button
            onClick={() => setCurrentPage('tasks')}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {tasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setCurrentPage('tasks')
                setSelectedTask(task)
                setShowTaskDetail(true)
                // 更新商品信息，以便在编辑页面显示
                setProductInfo({
                  id: task.id,
                  name: task.name.replace('单品生成', '').trim(),
                  brand: '',
                  type: 'clothing',
                  material: '棉质',
                  color: '多色可选',
                  size: 'S/M/L/XL',
                  targetAudience: '青年男女',
                  sellingPoints: '透气舒适，时尚百搭',
                  image: `https://picsum.photos/400/400?random=${task.id}`,
                  referenceImages: [],
                  referenceLinks: [],
                })
                // 如果任务已完成，显示结果面板
                if (task.status === 'completed') {
                  // 模拟加载该任务的结果
                  const mockResults: GeneratedResult[] = Array.from({ length: Math.min(task.totalItems, 4) }, (_, i) => ({
                    id: `task-${task.id}-result-${i}`,
                    productId: `product-${i}`,
                    productName: `${task.name} - 商品${i + 1}`,
                    mainImage: productInfo.image || `https://picsum.photos/400/400?random=${task.id}-${i}`,
                    title: `【品牌】${task.name} 优质商品 新款上市 限时特惠`,
                    sellingPoint: '✨ 优质面料，亲肤舒适\n🎯 精心设计，品质保证',
                    selected: false,
                    savedToLibrary: true,
                    createdAt: task.createdAt,
                    status: 'completed',
                    brand: '品牌',
                    category: '服装',
                    material: '棉质',
                    color: '多色可选',
                    size: 'S/M/L/XL',
                    targetAudience: '青年男女',
                  }))
                  setGeneratedResults(mockResults)
                }
              }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  task.status === 'completed' ? 'bg-green-100' :
                  task.status === 'processing' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {task.type === 'single' ? <Package className={`w-5 h-5 ${
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                  }`} /> :
                   task.type === 'batch' ? <FileSpreadsheet className={`w-5 h-5 ${
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                  }`} /> :
                   <FileUp className={`w-5 h-5 ${
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                  }`} />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{task.name}</p>
                  <p className="text-sm text-gray-500">
                    {task.type === 'single' ? '单品生成' : task.type === 'batch' ? '批量处理' : 'Excel导入'} ·
                    {task.totalItems}个商品
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {task.status === 'processing' && (
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                <span className={`text-sm ${
                  task.status === 'completed' ? 'text-green-600' :
                  task.status === 'processing' ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {task.status === 'completed' ? '已完成' :
                   task.status === 'processing' ? `${task.progress}%` : '等待中'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTasks = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品任务列表</h1>
          <p className="text-gray-500 mt-1">管理和追踪您的图文生成任务</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowInputPanel(true); setInputMode('single') }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>
      </div>

      {/* 输入模式选择 */}
      {!showInputPanel && !hasGenerated && (
        <div className="grid grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => { setShowInputPanel(true); setInputMode(action.id as 'single' | 'batch' | 'excel') }}
              className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.name}</h3>
              <p className="text-sm text-gray-500">{action.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* 任务列表 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">所有任务</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowHistoryPanel(true)}
                className="px-3 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                历史记录
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <Grid3X3 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setSelectedTask(task)
                setShowTaskDetail(true)
                // 如果任务已完成，加载结果数据
                if (task.status === 'completed') {
                  // 使用实际生成的结果，如果没有则显示提示
                  if (generatedResults.length > 0) {
                    setGeneratedResults(generatedResults)
                  } else {
                    // 显示占位符结果，提示用户上传图片
                    const placeholderResults: GeneratedResult[] = Array.from({ length: Math.min(task.totalItems, 6) }, (_, i) => ({
                      id: `task-${task.id}-result-${i}`,
                      productId: `product-${i}`,
                      productName: `${task.name} - 商品${i + 1}`,
                      mainImage: '', // 空图片，显示占位符
                      title: `【品牌】${task.name} 优质商品 新款上市 限时特惠`,
                      sellingPoint: '✨ 优质面料，亲肤舒适\n🎯 精心设计，品质保证',
                      selected: false,
                      savedToLibrary: true,
                      createdAt: task.createdAt,
                      status: 'completed',
                      brand: '品牌',
                      category: '服装',
                      material: '棉质',
                      color: '多色可选',
                      size: 'S/M/L/XL',
                      targetAudience: '青年男女',
                    }))
                    setGeneratedResults(placeholderResults)
                  }
                }
              }}
              className="p-6 cursor-pointer hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    task.status === 'completed' ? 'bg-green-100' :
                    task.status === 'processing' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {task.type === 'single' ? <Package className={`w-6 h-6 ${
                      task.status === 'completed' ? 'text-green-600' :
                      task.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                    }`} /> :
                     task.type === 'batch' ? <FileSpreadsheet className={`w-6 h-6 ${
                      task.status === 'completed' ? 'text-green-600' :
                      task.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                    }`} /> :
                     <FileUp className={`w-6 h-6 ${
                      task.status === 'completed' ? 'text-green-600' :
                      task.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                    }`} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>{task.type === 'single' ? '单品生成' : task.type === 'batch' ? '批量处理' : 'Excel导入'}</span>
                      <span>·</span>
                      <span>{task.totalItems}个商品</span>
                      <span>·</span>
                      <span>{task.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {task.status === 'processing' && (
                    <div className="w-40">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">进度</span>
                        <span className="text-blue-600">{task.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' :
                    task.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {task.status === 'completed' ? '已完成' :
                     task.status === 'processing' ? '处理中' : '等待中'}
                  </span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {task.status === 'failed' && (
                      <button
                        onClick={() => retryTask(task.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="重试"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTemplates = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板库</h1>
          <p className="text-gray-500 mt-1">管理和使用您的图文模板</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 outline-none w-64"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
          >
            <option value="all">全部分类</option>
            <option value="通用">通用</option>
            <option value="活动">活动</option>
            <option value="奢侈品">奢侈品</option>
            <option value="美妆">美妆</option>
            <option value="数码">数码</option>
            <option value="家居">家居</option>
          </select>
        </div>
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 添加新模板卡片 */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center h-80 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">添加新模板</h3>
          <p className="text-sm text-gray-500 text-center">创建自定义模板</p>
        </div>
        
        {templates
          .filter(t => filterCategory === 'all' || t.category === filterCategory)
          .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((template) => (
          <div key={template.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
            {/* 预览图 */}
            <div className={`h-40 bg-gradient-to-br ${template.preview} relative`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Layout className="w-12 h-12 text-white/50" />
              </div>
              <button
                onClick={() => toggleTemplateFavorite(template.id)}
                className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition"
              >
                <Heart className={`w-4 h-4 ${template.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
            </div>
            {/* 信息 */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500">{template.category} · {template.style}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">店铺分类: {template.shopCategory}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>使用 {template.usageCount} 次</span>
                <div className="flex gap-2">
                  <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                    使用模板
                  </button>
                  <button className="text-gray-600 hover:text-gray-700 font-medium">
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderLibrary = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">素材库</h1>
          <p className="text-gray-500 mt-1">管理您保存的图文素材</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索素材..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 outline-none w-64"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
          >
            <option value="all">全部分类</option>
            <option value="主图草稿">主图草稿</option>
            <option value="文案">文案</option>
          </select>
        </div>
      </div>

      {/* 素材网格 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 添加新素材卡片 */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center aspect-square hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">添加新素材</h3>
          <p className="text-xs text-gray-500 text-center">上传图片或文字素材</p>
        </div>
        
        {materialLibrary
          .filter(m => filterCategory === 'all' || m.category === filterCategory)
          .filter(m => m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) || m.content.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((material) => (
          <div key={material.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
            {material.type === 'image' ? (
              <div className="aspect-square relative">
                <img src={material.content} alt="素材" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMaterialFavorite(material.id)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                    >
                      <Heart className={`w-4 h-4 ${material.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </button>
                    <button
                      onClick={() => deleteMaterial(material.id)}
                      className="p-2 bg-white rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square p-4 bg-gray-50 relative group-hover:bg-gray-100 transition">
                <p className="text-sm text-gray-700 line-clamp-6">{material.content}</p>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyText(material.content)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => toggleMaterialFavorite(material.id)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                    >
                      <Heart className={`w-4 h-4 ${material.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </button>
                    <button
                      onClick={() => deleteMaterial(material.id)}
                      className="p-2 bg-white rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-gray-500 mb-2">{material.category}</p>
              <div className="flex flex-wrap gap-1">
                {material.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-500 mt-1">配置您的生成偏好和应用设置</p>
      </div>

      {/* 生成设置 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">生成设置</h3>
            <p className="text-sm text-gray-500">配置默认的生成参数</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">默认标题长度</p>
              <p className="text-sm text-gray-500">生成商品标题的最大字符数</p>
            </div>
            <input
              type="number"
              value={settings.defaultTitleLength}
              onChange={(e) => updateSettings('defaultTitleLength', parseInt(e.target.value))}
              className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">默认卖点数量</p>
              <p className="text-sm text-gray-500">每个商品生成的卖点文案条数</p>
            </div>
            <input
              type="number"
              value={settings.defaultSellingPointCount}
              onChange={(e) => updateSettings('defaultSellingPointCount', parseInt(e.target.value))}
              className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">自动保存到素材库</p>
              <p className="text-sm text-gray-500">生成完成后自动保存结果到素材库</p>
            </div>
            <button
              onClick={() => updateSettings('autoSaveToLibrary', !settings.autoSaveToLibrary)}
              className={`w-12 h-6 rounded-full transition relative ${
                settings.autoSaveToLibrary ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                settings.autoSaveToLibrary ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* 图文风格偏好 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <PaletteIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">图文风格偏好</h3>
            <p className="text-sm text-gray-500">选择默认的生成风格</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => updateSettings('preferredStyle', style.id)}
              className={`p-4 rounded-xl border-2 transition text-left ${
                settings.preferredStyle === style.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <style.icon className={`w-6 h-6 mb-2 ${
                settings.preferredStyle === style.id ? 'text-indigo-500' : 'text-gray-400'
              }`} />
              <p className={`font-medium ${
                settings.preferredStyle === style.id ? 'text-indigo-900' : 'text-gray-700'
              }`}>
                {style.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 通用设置 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">通用设置</h3>
            <p className="text-sm text-gray-500">应用基础配置</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">语言</p>
                <p className="text-sm text-gray-500">界面显示语言</p>
              </div>
            </div>
            <select
              value={settings.language}
              onChange={(e) => updateSettings('language', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
            >
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-gray-400" /> : <Sun className="w-5 h-5 text-gray-400" />}
              <div>
                <p className="font-medium text-gray-900">主题</p>
                <p className="text-sm text-gray-500">界面主题模式</p>
              </div>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => updateSettings('theme', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="auto">跟随系统</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">通知</p>
                <p className="text-sm text-gray-500">接收任务完成通知</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings('notifications', !settings.notifications)}
              className={`w-12 h-6 rounded-full transition relative ${
                settings.notifications ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                settings.notifications ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ==================== 输入面板渲染 ====================

  const renderInputPanel = () => {
    if (!showInputPanel) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInputPanel(false)} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Generation Parameters</h2>
            </div>
            <button
              onClick={() => setShowInputPanel(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {inputMode === 'single' && renderSingleProductForm()}
            {inputMode === 'batch' && renderBatchProductForm()}
            {inputMode === 'excel' && renderExcelImportForm()}
          </div>

          {/* 底部操作 */}
          <div className="flex flex-col gap-4 p-6 border-t border-gray-100 bg-gray-50">
            {/* 生成模式选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">生成模式</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generationMode"
                    value="default"
                    checked={generationMode === 'default'}
                    onChange={() => setGenerationMode('default')}
                    className="w-4 h-4 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">系统默认逻辑</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="generationMode"
                    value="template"
                    checked={generationMode === 'template'}
                    onChange={() => setGenerationMode('template')}
                    className="w-4 h-4 text-indigo-500 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">使用收藏模板</span>
                </label>
              </div>
              
              {/* 模板选择 */}
              {generationMode === 'template' && (
                <div className="mt-3">
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(e.target.value || null)}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  >
                    <option value="">选择模板</option>
                    {templates
                      .filter(t => t.isFavorite)
                      .map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="w-4 h-4 text-indigo-500 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">保存到素材库</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInputPanel(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (generationMode === 'template' && !selectedTemplate)}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      开始生成
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSingleProductForm = () => (
    <div className="space-y-6">
      {/* BASIC INFO */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Box className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">BASIC INFO</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Product Name</label>
              <input
                type="text"
                value={productInfo.name}
                onChange={(e) => updateProductInfo('name', e.target.value)}
                placeholder="请输入商品名称"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Brand</label>
              <input
                type="text"
                value={productInfo.brand}
                onChange={(e) => updateProductInfo('brand', e.target.value)}
                placeholder="请输入品牌"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <input
              type="text"
              value={productInfo.type}
              onChange={(e) => updateProductInfo('type', e.target.value)}
              placeholder="如：运动鞋、T恤"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* ATTRIBUTES */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">ATTRIBUTES</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Material</label>
            <input
              type="text"
              value={productInfo.material}
              onChange={(e) => updateProductInfo('material', e.target.value)}
              placeholder="如：飞织网面 + 橡胶底"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Color</label>
            <input
              type="text"
              value={productInfo.color}
              onChange={(e) => updateProductInfo('color', e.target.value)}
              placeholder="如：黑白 / 荧光绿"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Size</label>
            <input
              type="text"
              value={productInfo.size}
              onChange={(e) => updateProductInfo('size', e.target.value)}
              placeholder="如：39-45"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target Audience</label>
            <input
              type="text"
              value={productInfo.targetAudience}
              onChange={(e) => updateProductInfo('targetAudience', e.target.value)}
              placeholder="如：城市跑者，健身爱好者"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* ASSETS & REFERENCES */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">ASSETS & REFERENCES</h3>
        </div>
        <div className="space-y-3">
          {/* 商品图片上传 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Product Image</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'product')}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {productInfo.image ? (
                <div className="relative inline-block">
                  <img src={productInfo.image} alt="商品" className="max-h-32 rounded" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage('product') }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* 图生文按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // 从 base64 图片创建 File 对象
                      fetch(productInfo.image!)
                        .then(res => res.blob())
                        .then(blob => {
                          const file = new File([blob], 'product-image.jpg', { type: 'image/jpeg' })
                          handleAnalyzeImage(file)
                        })
                    }}
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full shadow-lg hover:from-blue-600 hover:to-purple-600 transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI分析图片
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">点击或拖拽上传商品图片</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'product')}
              className="hidden"
            />
          </div>

          {/* 参考链接 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reference Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newReferenceLink}
                onChange={(e) => setNewReferenceLink(e.target.value)}
                placeholder="输入参考链接"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-sm"
              />
              <button
                onClick={addReferenceLink}
                className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-sm"
              >
                添加
              </button>
            </div>
            {productInfo.referenceLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {productInfo.referenceLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                    <span className="text-gray-700 truncate max-w-[200px]">{link}</span>
                    <button
                      onClick={() => removeReferenceLink(index)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderBatchProductForm = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">批量添加商品信息</p>
        <button
          onClick={addBatchRow}
          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          添加一行
        </button>
      </div>
      
      <div className="space-y-3">
        {batchProducts.map((product, index) => (
          <div key={product.id} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl">
            <div className="w-16 h-16 flex-shrink-0">
              {product.image ? (
                <div className="relative w-full h-full">
                  <img src={product.image} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => handleRemoveImage('product', index)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setCurrentUploadIndex(index); fileInputRef.current?.click() }}
                  className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input
                type="text"
                value={product.name}
                onChange={(e) => updateBatchProduct(index, 'name', e.target.value)}
                placeholder="商品名称"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
              />
              <input
                type="text"
                value={product.brand}
                onChange={(e) => updateBatchProduct(index, 'brand', e.target.value)}
                placeholder="品牌"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
              />
              <input
                type="text"
                value={product.type}
                onChange={(e) => updateBatchProduct(index, 'type', e.target.value)}
                placeholder="类型"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={() => removeBatchRow(index)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={(e) => {
          if (e.target.files?.[0] && currentUploadIndex !== null) {
            handleFileSelect(e.target.files[0], 'product', currentUploadIndex)
            setCurrentUploadIndex(null)
          }
        }}
        className="hidden"
      />
    </div>
  )

  const renderExcelImportForm = () => (
    <div className="space-y-6">
      <div
        onClick={() => excelInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleExcelImport(file)
        }}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600 mb-2">点击或拖拽上传 Excel 文件</p>
        <p className="text-sm text-gray-400">支持 .xlsx、.xls 格式</p>
      </div>
      
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && handleExcelImport(e.target.files[0])}
        className="hidden"
      />

      {batchProducts.length > 0 && batchProducts[0].name && (
        <div>
          <p className="text-sm text-gray-600 mb-3">已导入 {batchProducts.length} 条数据，请补充上传图片：</p>
          <div className="space-y-3">
            {batchProducts.map((product, index) => (
              <div key={product.id} className="flex gap-3 items-center p-4 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 flex-shrink-0">
                  {product.image ? (
                    <div className="relative w-full h-full">
                      <img src={product.image} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        onClick={() => handleRemoveImage('product', index)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setCurrentUploadIndex(index); fileInputRef.current?.click() }}
                      className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition"
                    >
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.brand} · {product.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Excel 格式说明</h4>
        <p className="text-sm text-blue-700">请确保 Excel 文件包含以下列：商品名称、品牌、类型。图片可以导入后单独上传。</p>
      </div>
    </div>
  )

  const renderResultsPanel = () => (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHasGenerated(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">生成完成</h2>
              <p className="text-xs text-gray-500">共生成 {generatedResults.length} 个商品的内容</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              导出选中
            </button>
            <button
              onClick={() => setHasGenerated(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {generatedResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleSelectResult(result.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  result.selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 flex-shrink-0">
                    {result.mainImage ? (
                      <img
                        src={result.mainImage}
                        alt={result.productName}
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowProductDetail(result)
                        }}
                        className="w-full h-full object-cover rounded cursor-pointer hover:opacity-90 transition"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-xs">未上传图片</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{result.productName}</h3>
                      {result.selected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div>
                        <p className="text-xs text-gray-500">标题</p>
                        <p className="text-sm text-gray-900">{result.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">卖点</p>
                        <p className="text-sm text-gray-700">{result.sellingPoint}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyText(result.title) }}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                      >
                        复制标题
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyText(result.sellingPoint) }}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                      >
                        复制卖点
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation()
                          setShowProductDetail(result)
                          setShowCopywritingPanel(true)
                        }}
                        className="text-xs px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:from-purple-600 hover:to-pink-600 transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI生成文案
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditResult(result) }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                      >
                        编辑
                      </button>
                    </div>
                  </div>
                </div>
                {result.savedToLibrary && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    已保存到素材库
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <p className="text-xs text-gray-500">
            已选择 {generatedResults.filter(r => r.selected).length} / {generatedResults.length} 个商品
          </p>
        </div>
      </div>
    </div>
  )

  // ==================== 任务详情/编辑面板 ====================

  const renderTaskDetailPanel = () => {
    if (!showTaskDetail || !selectedTask) return null

    const isProcessing = selectedTask.status === 'processing'
    const isCompleted = selectedTask.status === 'completed'
    const isPending = selectedTask.status === 'pending'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTaskDetail(false)} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCompleted ? 'bg-green-100' : isProcessing ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {selectedTask.type === 'single' ? <Package className={`w-5 h-5 ${
                  isCompleted ? 'text-green-600' : isProcessing ? 'text-blue-600' : 'text-gray-600'
                }`} /> :
                 selectedTask.type === 'batch' ? <FileSpreadsheet className={`w-5 h-5 ${
                  isCompleted ? 'text-green-600' : isProcessing ? 'text-blue-600' : 'text-gray-600'
                }`} /> :
                 <FileUp className={`w-5 h-5 ${
                  isCompleted ? 'text-green-600' : isProcessing ? 'text-blue-600' : 'text-gray-600'
                }`} />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTask.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedTask.type === 'single' ? '单品生成' : selectedTask.type === 'batch' ? '批量处理' : 'Excel导入'} ·
                  {selectedTask.totalItems}个商品 ·
                  创建于 {selectedTask.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isProcessing && (
                <button
                  onClick={() => {
                    // 模拟暂停/继续
                    alert('暂停/继续功能')
                  }}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  暂停
                </button>
              )}
              {isCompleted && !isEditingTask && (
                <>
                  <button
                    onClick={startEditTask}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                </>
              )}
              {isEditingTask && (
                <>
                  <button
                    onClick={() => setIsEditingTask(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveEditingTask}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowTaskDetail(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 状态栏 */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">状态</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isCompleted ? 'bg-green-100 text-green-700' :
                    isProcessing ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {isCompleted ? '已完成' : isProcessing ? '处理中' : '等待中'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">进度</span>
                  <span className="text-sm font-medium text-gray-900">{selectedTask.progress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">已完成</span>
                  <span className="text-sm font-medium text-gray-900">{selectedTask.completedItems}/{selectedTask.totalItems}</span>
                </div>
              </div>
              {isProcessing && (
                <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${selectedTask.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {isProcessing && (
              <div className="space-y-6">
                {/* 编辑表单 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      编辑商品信息
                    </h3>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">处理中可编辑</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">商品名称</label>
                      <input
                        type="text"
                        defaultValue={selectedTask.name.replace('单品生成', '').trim()}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入商品名称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">品牌</label>
                      <input
                        type="text"
                        defaultValue=""
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入品牌"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">类型</label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none">
                        <option value="">选择类型</option>
                        <option value="clothing" selected>服装</option>
                        <option value="shoes">鞋靴</option>
                        <option value="accessories">配饰</option>
                        <option value="home">家居</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">材质</label>
                      <input
                        type="text"
                        defaultValue="棉质"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入材质"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">颜色</label>
                      <input
                        type="text"
                        defaultValue="多色可选"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入颜色"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">尺寸</label>
                      <input
                        type="text"
                        defaultValue="S/M/L/XL"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入尺寸"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">适用人群</label>
                      <input
                        type="text"
                        defaultValue="青年男女"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入适用人群"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">卖点</label>
                      <input
                        type="text"
                        defaultValue="透气舒适，时尚百搭"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入卖点"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-2">商品图片</label>
                    <div className="flex gap-4">
                      <div
                        onClick={() => {
                          fileInputRef.current?.click()
                          setCurrentUploadIndex(null)
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const file = e.dataTransfer.files[0]
                          if (file) {
                            handleFileSelect(file, 'product')
                          }
                        }}
                        className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-500 transition"
                      >
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      {productInfo.image ? (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center relative">
                          <img 
                            src={productInfo.image} 
                            alt="商品图" 
                            className="w-full h-full object-cover rounded-lg cursor-pointer"
                            onClick={() => {
                              fileInputRef.current?.click()
                              setCurrentUploadIndex(null)
                            }}
                          />
                          <button
                            onClick={() => handleRemoveImage('product')}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0], 'product')
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 处理状态提示 */}
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="flex-1">
                    <p className="text-blue-700 font-medium">任务正在处理中...</p>
                    <p className="text-blue-600 text-sm">您可以继续编辑商品信息，保存后将自动更新</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">{selectedTask.progress}%</p>
                  </div>
                </div>

                {/* 处理队列 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">处理进度</h3>
                  <div className="space-y-2">
                    {Array.from({ length: Math.min(selectedTask.totalItems, 5) }, (_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          i < selectedTask.completedItems ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {i < selectedTask.completedItems ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-gray-500">{i + 1}</span>
                          )}
                        </div>
                        <span className="flex-1 text-sm text-gray-700">商品 {i + 1}</span>
                        {i < selectedTask.completedItems ? (
                          <span className="text-xs text-green-600">已完成</span>
                        ) : i === selectedTask.completedItems ? (
                          <span className="text-xs text-blue-600">处理中...</span>
                        ) : (
                          <span className="text-xs text-gray-400">等待中</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isPending && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">任务等待中</h3>
                <p className="text-gray-500 mb-6">该任务正在队列中等待处理</p>
                <button
                  onClick={() => {
                    setTasks(prev => prev.map(t =>
                      t.id === selectedTask.id ? { ...t, status: 'processing', progress: 10 } : t
                    ))
                    setSelectedTask({ ...selectedTask, status: 'processing', progress: 10 })
                  }}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition"
                >
                  开始处理
                </button>
              </div>
            )}

            {isCompleted && isEditingTask && (
              <div className="space-y-6">
                {/* 编辑表单 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    编辑商品信息
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">商品名称</label>
                      <input
                        type="text"
                        value={editingTaskData.name}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入商品名称"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">品牌</label>
                      <input
                        type="text"
                        value={editingTaskData.brand}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入品牌"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">类目</label>
                      <input
                        type="text"
                        value={editingTaskData.category}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入类目"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">材质</label>
                      <input
                        type="text"
                        value={editingTaskData.material}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, material: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入材质"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">颜色</label>
                      <input
                        type="text"
                        value={editingTaskData.color}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入颜色"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">尺寸</label>
                      <input
                        type="text"
                        value={editingTaskData.size}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, size: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入尺寸"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">适用人群</label>
                      <input
                        type="text"
                        value={editingTaskData.targetAudience}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, targetAudience: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入适用人群"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">卖点</label>
                      <input
                        type="text"
                        value={editingTaskData.sellingPoints}
                        onChange={(e) => setEditingTaskData(prev => ({ ...prev, sellingPoints: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="输入卖点"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-2">商品图片</label>
                    <div className="flex gap-4">
                      {!editingTaskData.image ? (
                        <div
                          onClick={() => {
                            fileInputRef.current?.click()
                          }}
                          className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-500 transition"
                        >
                          <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center relative">
                          <img 
                            src={editingTaskData.image} 
                            alt="商品图" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            onClick={() => setEditingTaskData(prev => ({ ...prev, image: '' }))}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            setEditingTaskData(prev => ({ ...prev, image: event.target?.result as string }))
                          }
                          reader.readAsDataURL(e.target.files[0])
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {isCompleted && !isEditingTask && generatedResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">生成结果</h3>
                <div className="grid grid-cols-2 gap-4">
                  {generatedResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => handleSelectResult(result.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        result.selected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="w-24 h-24 flex-shrink-0">
                          {result.mainImage ? (
                            <img
                              src={result.mainImage}
                              alt={result.productName}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
                              <ImageIcon className="w-8 h-8 mb-1" />
                              <span className="text-xs">未上传图片</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900 truncate">{result.productName}</h4>
                            {result.selected && (
                              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-1">{result.title}</p>
                          <p className="text-xs text-gray-500 whitespace-pre-line line-clamp-2">{result.sellingPoint}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCompleted && generatedResults.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无生成结果</p>
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-2">
              {isProcessing && (
                <button
                  onClick={() => {
                    if (confirm('确定要取消该任务吗？')) {
                      setTasks(prev => prev.map(t =>
                        t.id === selectedTask.id ? { ...t, status: 'failed' } : t
                      ))
                      setShowTaskDetail(false)
                    }
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                >
                  取消任务
                </button>
              )}
              {(isCompleted || isPending) && (
                <button
                  onClick={() => {
                    if (confirm('确定要删除该任务吗？')) {
                      deleteTask(selectedTask.id)
                      setShowTaskDetail(false)
                    }
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除任务
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTaskDetail(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl transition"
              >
                关闭
              </button>
              {isProcessing && (
                <button
                  onClick={async () => {
                    // 显示加载状态
                    setIsSaving(true)
                    setSaveSuccess(false)
                    
                    try {
                      // 模拟保存过程
                      await new Promise(resolve => setTimeout(resolve, 2000))
                      
                      // 更新任务状态为已完成
                      setTasks(prev => prev.map(t =>
                        t.id === selectedTask.id
                          ? { ...t, status: 'completed', progress: 100, completedItems: t.totalItems, completedAt: new Date() }
                          : t
                      ))
                      // 更新当前选中的任务状态
                      setSelectedTask({
                        ...selectedTask,
                        status: 'completed',
                        progress: 100,
                        completedItems: selectedTask.totalItems,
                        completedAt: new Date()
                      })
                      // 生成结果数据 - 使用用户上传的商品图片
                      const mockResults: GeneratedResult[] = Array.from({ length: Math.min(selectedTask.totalItems, 6) }, (_, i) => {
                        // 获取用户上传的商品图片，如果没有则使用默认图
                        const userImage = productInfo.image || (batchProducts[i] && batchProducts[i].image)
                        return {
                          id: `task-${selectedTask.id}-result-${i}`,
                          productId: `product-${i}`,
                          productName: `${selectedTask.name} - 商品${i + 1}`,
                          mainImage: userImage || `https://picsum.photos/400/400?random=${selectedTask.id}-${i}`,
                          title: `【${productInfo.brand || '品牌'}】${productInfo.name || selectedTask.name} ${productInfo.material || ''} ${productInfo.sellingPoints?.slice(0, 20) || '优质商品'}`,
                          sellingPoint: productInfo.sellingPoints || '✨ 优质面料，亲肤舒适\n🎯 精心设计，品质保证',
                          selected: false,
                          savedToLibrary: true,
                          createdAt: selectedTask.createdAt,
                          status: 'completed',
                          brand: productInfo.brand || '品牌',
                          category: productInfo.type || '服装',
                          material: productInfo.material || '棉质',
                          color: productInfo.color || '多色可选',
                          size: productInfo.size || 'S/M/L/XL',
                          targetAudience: productInfo.targetAudience || '青年男女',
                        }
                      })
                      setGeneratedResults(mockResults)
                      
                      // 显示成功状态
                      setSaveSuccess(true)
                      setTimeout(() => setSaveSuccess(false), 3000)
                    } finally {
                      // 隐藏加载状态
                      setIsSaving(false)
                    }
                  }}
                  className={`px-6 py-2 rounded-xl hover:bg-indigo-600 transition flex items-center gap-2 ${
                    isSaving ? 'bg-indigo-300 cursor-not-allowed' : 
                    saveSuccess ? 'bg-green-500' : 'bg-indigo-500 text-white'
                  }`}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      保存中...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      保存成功
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      保存并完成
                    </>
                  )}
                </button>
              )}
              {isCompleted && (
                <button
                  onClick={() => {
                    setHasGenerated(true)
                    setShowTaskDetail(false)
                  }}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition"
                >
                  查看完整结果
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== 商品详情模态框 ====================

  const renderProductDetailModal = () => {
    if (!showProductDetail) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">商品详情</h2>
              <button
                onClick={() => setShowProductDetail(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 商品图片 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">商品图片</h3>
                <div className="relative border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img
                    src={showProductDetail.mainImage}
                    alt={showProductDetail.productName}
                    className="w-full h-auto max-h-48 object-contain mx-auto"
                  />
                  <button
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* 商品标题 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">商品标题</h3>
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  <p className="text-sm text-gray-900">{showProductDetail.title}</p>
                </div>
              </div>
              
              {/* 商品卖点 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">商品卖点</h3>
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  <p className="text-sm text-gray-700">{showProductDetail.sellingPoint}</p>
                </div>
              </div>
              
              {/* 商品详情 */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">商品信息</h3>
                <div className="grid grid-cols-2 gap-3">
                  {showProductDetail.brand && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">品牌</p>
                      <p className="text-sm text-gray-700">{showProductDetail.brand}</p>
                    </div>
                  )}
                  {showProductDetail.category && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">品类</p>
                      <p className="text-sm text-gray-700">{showProductDetail.category}</p>
                    </div>
                  )}
                  {showProductDetail.material && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">材质</p>
                      <p className="text-sm text-gray-700">{showProductDetail.material}</p>
                    </div>
                  )}
                  {showProductDetail.color && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">颜色</p>
                      <p className="text-sm text-gray-700">{showProductDetail.color}</p>
                    </div>
                  )}
                  {showProductDetail.size && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">尺寸</p>
                      <p className="text-sm text-gray-700">{showProductDetail.size}</p>
                    </div>
                  )}
                  {showProductDetail.targetAudience && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">适用人群</p>
                      <p className="text-sm text-gray-700">{showProductDetail.targetAudience}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 商品链接 */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">商品链接</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`【请替换为真实商品链接】`}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none text-gray-400"
                  />
                  <button
                    onClick={() => {
                      alert('这是原型系统，请替换为真实电商平台链接')
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </button>
                </div>
              </div>
              
              {/* AI生成文案按钮 */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => setShowCopywritingPanel(true)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2"
                >
                  <MagicIcon className="w-4 h-4" />
                  AI生成抖音文案
                </button>
              </div>

              {/* 查看商品详情页按钮 */}
              <div className="pt-3">
                <button
                  onClick={() => {
                    alert('这是原型系统，商品详情页功能暂未接入真实电商平台')
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  查看商品详情页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== 文案生成面板 ====================

  const renderCopywritingPanel = () => {
    if (!showCopywritingPanel || !showProductDetail) return null

    const styles: CopywritingStyle[] = [
      'douyin_hype',
      'douyin_emotional',
      'douyin_professional',
      'douyin_funny',
      'douyin_story',
      'xiaohongshu',
    ]

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <MagicIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI 文案生成</h2>
                  <p className="text-sm text-gray-500">基于商品信息智能生成抖音电商文案</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCopywritingPanel(false)
                  setGeneratedCopywriting(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 商品信息展示 */}
            {!generatedCopywriting && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">商品信息</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">商品名称：</span>
                      <span className="text-sm text-gray-900">{showProductDetail.productName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">品牌：</span>
                      <span className="text-sm text-gray-900">{showProductDetail.brand}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">类目：</span>
                      <span className="text-sm text-gray-900">{showProductDetail.category}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">材质：</span>
                      <span className="text-sm text-gray-900">{showProductDetail.material}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">颜色：</span>
                      <span className="text-sm text-gray-900">{showProductDetail.color}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">适用人群：</span>
                      <span className="text-sm text-gray-900">{showProductDetail.targetAudience}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 风格选择 */}
            {!generatedCopywriting && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">选择文案风格</h3>
                <div className="grid grid-cols-3 gap-3">
                  {styles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setSelectedCopywritingStyle(style)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedCopywritingStyle === style
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{styleNames[style]}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{styleDescriptions[style]}</p>
                    </button>
                  ))}
                </div>

                {/* 生成按钮 */}
                <button
                  onClick={handleGenerateCopywriting}
                  disabled={isGeneratingCopy}
                  className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                >
                  {isGeneratingCopy ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <MagicIcon className="w-5 h-5" />
                      生成文案
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 生成结果 */}
            {generatedCopywriting && (
              <div className="space-y-4">
                {/* 复制按钮 */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">生成的文案</h3>
                  <button
                    onClick={() => {
                      const textToCopy = `${generatedCopywriting.title}\n\n${generatedCopywriting.content}\n\n${generatedCopywriting.hashtags.join(' ')}`
                      navigator.clipboard.writeText(textToCopy)
                      alert('文案已复制到剪贴板')
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </button>
                </div>

                {/* 标题 */}
                <div>
                  <h4 className="text-xs text-gray-500 mb-2">标题</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-base font-semibold text-gray-900">{generatedCopywriting.title}</p>
                  </div>
                </div>

                {/* 正文 */}
                <div>
                  <h4 className="text-xs text-gray-500 mb-2">正文</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{generatedCopywriting.content}</p>
                  </div>
                </div>

                {/* 话题标签 */}
                <div>
                  <h4 className="text-xs text-gray-500 mb-2">话题标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedCopywriting.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setGeneratedCopywriting(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                  >
                    重新生成
                  </button>
                  <button
                    onClick={handleApplyCopywriting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition font-medium shadow-lg shadow-purple-200"
                  >
                    应用文案
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== 图生文分析面板 ====================

  const renderImageAnalysisPanel = () => {
    if (!showImageAnalysisPanel) return null

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI 图片分析</h2>
                  <p className="text-sm text-gray-500">智能识别商品图片，自动生成卖点和关键词</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImageAnalysisPanel(false)
                  setImageAnalysisResult(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 图片预览 */}
            {productInfo.image && (
              <div className="mb-6">
                <img 
                  src={productInfo.image} 
                  alt="分析中的商品" 
                  className="w-full max-h-48 object-contain rounded-lg bg-gray-50"
                />
              </div>
            )}

            {/* 分析中状态 */}
            {isAnalyzingImage && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-gray-600">正在分析图片，提取商品信息...</p>
                <p className="text-sm text-gray-400 mt-1">AI正在识别商品特征、风格和卖点</p>
              </div>
            )}

            {/* 分析结果 */}
            {imageAnalysisResult && !isAnalyzingImage && (
              <div className="space-y-6">
                {/* 商品描述 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-500" />
                    商品描述
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{imageAnalysisResult.description}</p>
                  </div>
                </div>

                {/* 商品类目和风格 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">商品类目</h3>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {imageAnalysisResult.category}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">风格特点</h3>
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {imageAnalysisResult.style}
                    </span>
                  </div>
                </div>

                {/* 适用人群 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">适用人群</h3>
                  <p className="text-sm text-gray-700">{imageAnalysisResult.targetAudience}</p>
                </div>

                {/* 核心卖点 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    核心卖点
                  </h3>
                  <div className="space-y-2">
                    {imageAnalysisResult.sellingPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-3 bg-yellow-50 rounded-lg p-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <p className="text-sm text-gray-700">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 关键词 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-500" />
                    推荐关键词
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {imageAnalysisResult.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowImageAnalysisPanel(false)
                      setImageAnalysisResult(null)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                  >
                    关闭
                  </button>
                  <button
                    onClick={handleApplyImageAnalysis}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition font-medium shadow-lg shadow-blue-200"
                  >
                    应用到商品
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== Toast 提示 ====================

  const renderToast = () => {
    if (!toast.show) return null

    const bgColor = toast.type === 'success' 
      ? 'bg-green-500' 
      : toast.type === 'error' 
        ? 'bg-red-500' 
        : 'bg-blue-500'

    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100]">
        <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {toast.type === 'error' && <X className="w-5 h-5" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      </div>
    )
  }

  // ==================== 对话历史面板 ====================

  const renderHistoryPanel = () => {
    if (!showHistoryPanel) return null

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">对话历史</h2>
                <p className="text-sm text-gray-500">共 {chatHistory.length} 条记录</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chatHistory.length > 0 && (
                <button
                  onClick={exportChatHistory}
                  className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出JSON
                </button>
              )}
              <button
                onClick={() => setShowHistoryPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 历史列表 */}
          <div className="flex-1 overflow-y-auto p-6">
            {chatHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无对话历史</p>
                <p className="text-sm text-gray-400 mt-1">生成的内容将自动保存到这里</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {item.productInfo.name || '未命名商品'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteChatHistoryItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">品牌：</span>
                        <span className="text-gray-700">{item.productInfo.brand || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">类目：</span>
                        <span className="text-gray-700">{item.productInfo.type || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">生成结果：</span>
                        <span className="text-gray-700">{item.generatedResults.length} 个</span>
                      </div>
                      <div>
                        <span className="text-gray-500">文案生成：</span>
                        <span className="text-gray-700">{item.copywritingResults.length} 条</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ==================== 编辑面板 ====================

  const renderEditPanel = () => {
    if (!showEditPanel || !editingResult) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">编辑商品</h2>
              <button
                onClick={() => setShowEditPanel(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 商品图片 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商品图片</label>
                <div className="relative">
                  <img
                    src={editingResult.mainImage}
                    alt={editingResult.productName}
                    className="w-full max-w-md h-auto rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => {/* 实现图片编辑功能 */}}
                      className="p-2 bg-white/80 backdrop-blur rounded hover:bg-white transition"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 商品标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商品标题</label>
                <textarea
                  value={editingResult.title}
                  onChange={(e) => handleUpdateResult({ title: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  placeholder="请输入商品标题"
                />
              </div>
              
              {/* 商品卖点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商品卖点</label>
                <textarea
                  value={editingResult.sellingPoint}
                  onChange={(e) => handleUpdateResult({ sellingPoint: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  placeholder="请输入商品卖点，每行一个"
                />
              </div>
              
              {/* 底部操作 */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEditPanel(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition"
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== 主渲染 ====================

  return (
    <div className="min-h-screen dot-pattern">
      {renderSidebar()}

      <main className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          {currentPage === 'home' && renderHome()}
          {currentPage === 'tasks' && renderTasks()}
          {currentPage === 'templates' && renderTemplates()}
          {currentPage === 'library' && renderLibrary()}
          {currentPage === 'settings' && renderSettings()}
        </div>
      </main>

      {/* 输入面板弹窗 */}
      {renderInputPanel()}

      {/* 生成结果弹窗 */}
      {hasGenerated && renderResultsPanel()}

      {/* 任务详情/编辑面板 */}
      {showTaskDetail && renderTaskDetailPanel()}

      {/* 商品详情模态框 */}
      {renderProductDetailModal()}
      
      {/* 文案生成面板 */}
      {renderCopywritingPanel()}

      {/* 图生文分析面板 */}
      {renderImageAnalysisPanel()}

      {/* 对话历史面板 */}
      {renderHistoryPanel()}
      
      {/* 编辑面板 */}
      {renderEditPanel()}

      {/* Toast 提示 */}
      {renderToast()}
      </div>
    )
}

export default App
