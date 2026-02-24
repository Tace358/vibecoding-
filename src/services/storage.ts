// 数据存储服务模块 - 使用 localStorage 持久化存储

const STORAGE_KEY = 'ecommerce_product_tasks'

// 商品任务数据结构
export interface ProductTask {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  type: 'single' | 'batch' | 'excel'
  progress: number
  totalItems: number
  completedItems: number
  createdAt: string
  completedAt?: string
  product?: {
    basicInfo: {
      name: string
      brand: string
      category: string
      subCategory?: string
      material?: string
      color?: string
      size?: string
      targetAudience?: string
      sellingPoints?: string
    }
    inputAssets: {
      productImages: Array<{
        id: string
        url: string
        type: string
        description?: string
      }>
      referenceLinks?: string[]
      referenceVideos?: string[]
    }
  }
  aiGeneratedResults?: {
    titles?: Array<{
      id: string
      content: string
      style: string
      charCount?: number
      isSelected?: boolean
    }>
    copywritings?: Array<{
      id: string
      style: string
      styleName: string
      title: string
      content: string
      hashtags: string[]
      isSelected?: boolean
    }>
    posters?: Array<{
      id: string
      url: string
      type: string
      template?: string
      isSelected?: boolean
    }>
  }
}

// Mock 数据 - 10条抖音风商品任务（图片字段为空，需要用户上传）
const mockTasks: ProductTask[] = [
  {
    id: 'task_20240223_001',
    name: '春季碎花连衣裙推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T10:00:00Z',
    completedAt: '2024-02-23T10:05:00Z',
    product: {
      basicInfo: {
        name: '法式碎花连衣裙',
        brand: '花漾年华',
        category: '女装',
        subCategory: '连衣裙',
        material: '雪纺',
        color: '粉色碎花',
        size: 'S/M/L/XL',
        targetAudience: '20-30岁年轻女性',
        sellingPoints: '显瘦遮肉、法式浪漫、春游必备'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't001', content: '🔥这条碎花裙绝了！穿上秒变法式仙女，春游拍照美炸了！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c001',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '姐妹们！这条碎花裙真的绝绝子！',
          content: '亲测好用！穿上这条裙子去春游，被问了800次链接！\n\n✨雪纺面料超轻盈，风吹起来仙到爆！\n✨碎花图案绝美，拍照直接出片！\n✨收腰设计太显瘦了，梨形身材也能穿！\n\n春天不穿碎花裙穿什么？这条必须冲！\n\n#碎花裙 #春季穿搭 #法式风格 #显瘦穿搭',
          hashtags: ['#碎花裙', '#春季穿搭', '#法式风格', '#显瘦穿搭'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_002',
    name: '无线蓝牙耳机推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T10:30:00Z',
    completedAt: '2024-02-23T10:35:00Z',
    product: {
      basicInfo: {
        name: '降噪无线蓝牙耳机',
        brand: '音悦',
        category: '数码',
        subCategory: '耳机',
        material: 'ABS+硅胶',
        color: '白色/黑色',
        targetAudience: '学生党、上班族',
        sellingPoints: '主动降噪、超长续航、音质清晰'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't002', content: '🔥百元耳机千元音质！这降噪效果我直接跪了！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c002',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '救命！这个耳机降噪太牛了！',
          content: '家人们谁懂啊！在地铁上戴上这个耳机，整个世界都安静了！\n\n🔥主动降噪真的绝，噪音瞬间消失！\n🔥音质清晰到哭，低音炮效果炸裂！\n🔥续航30小时，一周充一次电！\n\n学生党、上班族必入！性价比天花板！\n\n#蓝牙耳机 #降噪耳机 #数码好物 #学生党必备',
          hashtags: ['#蓝牙耳机', '#降噪耳机', '#数码好物', '#学生党必备'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_003',
    name: '口红套装推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T11:00:00Z',
    completedAt: '2024-02-23T11:05:00Z',
    product: {
      basicInfo: {
        name: '丝绒哑光口红套装',
        brand: '魅色',
        category: '美妆',
        subCategory: '口红',
        material: '植物蜡',
        color: '正红/豆沙/橘红',
        targetAudience: '18-35岁女性',
        sellingPoints: '显白不挑皮、持久不脱色、滋润不拔干'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't003', content: '✨黄皮亲妈！这三支口红涂上去白到发光！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c003',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '挖到宝了！这个口红套装太绝了！',
          content: '姐妹们！这个口红套装真的闭眼入！三支颜色都超美！\n\n💄正红色气场全开，约会必备！\n💄豆沙色温柔日常，通勤首选！\n💄橘红色元气显白，春夏绝配！\n\n丝绒质地太高级了，涂上去嘴唇像开了滤镜！\n\n#口红推荐 #显白口红 #美妆好物 #平价彩妆',
          hashtags: ['#口红推荐', '#显白口红', '#美妆好物', '#平价彩妆'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_004',
    name: '高腰牛仔裤推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T11:30:00Z',
    completedAt: '2024-02-23T11:35:00Z',
    product: {
      basicInfo: {
        name: '高腰显瘦直筒牛仔裤',
        brand: '牛仔工坊',
        category: '女装',
        subCategory: '牛仔裤',
        material: '弹力牛仔布',
        color: '深蓝/浅蓝/黑色',
        size: '25-32码',
        targetAudience: '20-35岁女性',
        sellingPoints: '高腰显瘦、修饰腿型、弹力舒适'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't004', content: '🔥这条牛仔裤太神了！腿粗胯宽都能穿成筷子腿！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c004',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '梨形身材救星！这条牛仔裤绝了！',
          content: '亲测！本梨形身材终于找到命定牛仔裤了！\n\n🔥高腰设计太显瘦，小肚子瞬间消失！\n🔥直筒版型修饰腿型，O型腿也能变直！\n🔥弹力面料超舒服，蹲坐都不勒！\n\n搭配什么上衣都好看，真的百搭神器！\n\n#牛仔裤 #显瘦穿搭 #梨形身材 #春季穿搭',
          hashtags: ['#牛仔裤', '#显瘦穿搭', '#梨形身材', '#春季穿搭'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_005',
    name: '便携充电宝推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T12:00:00Z',
    completedAt: '2024-02-23T12:05:00Z',
    product: {
      basicInfo: {
        name: '超薄快充充电宝',
        brand: '能量块',
        category: '数码',
        subCategory: '充电宝',
        material: '铝合金',
        color: '银色/玫瑰金',
        targetAudience: '手机重度用户',
        sellingPoints: '20000毫安大容量、22.5W快充、轻薄便携'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't005', content: '🔥手机续航焦虑有救了！这个充电宝薄到能塞进口袋！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c005',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '出门必备！这个充电宝真的绝了！',
          content: '家人们！出门再也不怕手机没电了！\n\n⚡20000毫安大容量，能充4-5次！\n⚡22.5W快充，半小时充50%！\n⚡超薄设计，放包里完全不占地方！\n\n出差、旅游、逛街必备！电量安全感拉满！\n\n#充电宝 #快充 #数码好物 #出门必备',
          hashtags: ['#充电宝', '#快充', '#数码好物', '#出门必备'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_006',
    name: '面膜套装推广',
    status: 'completed',
    type: 'batch',
    progress: 100,
    totalItems: 3,
    completedItems: 3,
    createdAt: '2024-02-23T12:30:00Z',
    completedAt: '2024-02-23T12:45:00Z',
    product: {
      basicInfo: {
        name: '玻尿酸补水面膜',
        brand: '水润肌',
        category: '美妆',
        subCategory: '面膜',
        material: '天丝膜布',
        targetAudience: '干性肌肤、熬夜党',
        sellingPoints: '深层补水、提亮肤色、舒缓修护'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't006', content: '✨熬夜脸有救了！敷完这个面膜皮肤像剥壳鸡蛋！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c006',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '亲测好用！这个面膜补水太绝了！',
          content: '姐妹们！熬夜后敷这个面膜，第二天皮肤状态绝了！\n\n💧玻尿酸精华超足，敷完脸嫩到掐出水！\n💧天丝膜布超服帖，边敷边刷手机都不掉！\n💧提亮效果肉眼可见，暗沉一扫而空！\n\n一周敷2-3次，皮肤状态稳定多了！\n\n#面膜推荐 #补水面膜 #熬夜急救 #护肤好物',
          hashtags: ['#面膜推荐', '#补水面膜', '#熬夜急救', '#护肤好物'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_007',
    name: '针织开衫推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T13:00:00Z',
    completedAt: '2024-02-23T13:05:00Z',
    product: {
      basicInfo: {
        name: '温柔风针织开衫',
        brand: '软糯家',
        category: '女装',
        subCategory: '针织衫',
        material: '羊毛混纺',
        color: '米白/卡其/灰色',
        size: '均码',
        targetAudience: '25-40岁女性',
        sellingPoints: '柔软亲肤、百搭温柔、春秋必备'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't007', content: '✨这件开衫太温柔了！穿上就是韩剧女主本人！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c007',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '温柔到骨子里！这件开衫绝了！',
          content: '姐妹们！这件开衫穿上真的太温柔了！\n\n🧶羊毛混纺超软糯，贴身穿不扎人！\n🧶版型宽松显瘦，遮肉效果一流！\n🧶米白色太百搭了，配裙子裤子都好看！\n\n春秋换季必备，空调房也能穿！\n\n#针织开衫 #温柔穿搭 #秋季穿搭 #韩系风格',
          hashtags: ['#针织开衫', '#温柔穿搭', '#秋季穿搭', '#韩系风格'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_008',
    name: '智能手表推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T13:30:00Z',
    completedAt: '2024-02-23T13:35:00Z',
    product: {
      basicInfo: {
        name: '运动智能手表',
        brand: '智动',
        category: '数码',
        subCategory: '智能手表',
        material: '铝合金+硅胶',
        color: '黑色/银色',
        targetAudience: '运动爱好者、健身人群',
        sellingPoints: '心率监测、运动模式、防水设计'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't008', content: '🔥健身党必入！这个手表功能多到离谱，价格却香到哭！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c008',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '运动神器！这个智能手表太香了！',
          content: '健身的兄弟们！这个手表真的闭眼入！\n\n⌚心率监测超准，运动强度一目了然！\n⌚50种运动模式，跑步游泳都能记录！\n⌚防水设计，游泳洗澡都不用摘！\n\n续航7天，不用天天充电！性价比绝了！\n\n#智能手表 #运动装备 #健身好物 #数码推荐',
          hashtags: ['#智能手表', '#运动装备', '#健身好物', '#数码推荐'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_009',
    name: '眼影盘推广',
    status: 'completed',
    type: 'single',
    progress: 100,
    totalItems: 1,
    completedItems: 1,
    createdAt: '2024-02-23T14:00:00Z',
    completedAt: '2024-02-23T14:05:00Z',
    product: {
      basicInfo: {
        name: '九色大地色眼影盘',
        brand: '眼妆大师',
        category: '美妆',
        subCategory: '眼影',
        targetAudience: '化妆新手、日常通勤',
        sellingPoints: '配色实用、显色度高、不易飞粉'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't009', content: '✨新手闭眼入！这盘眼影配色太实用了，随便画都好看！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c009',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '新手友好！这个眼影盘绝了！',
          content: '化妆新手姐妹们！这盘眼影真的太好上手了！\n\n👁️九色配色超实用，日常通勤一盘搞定！\n👁️显色度刚刚好，不怕下手重！\n👁️粉质细腻不飞粉，晕染超自然！\n\n大地色系消肿又百搭，肿眼泡也能用！\n\n#眼影盘 #新手化妆 #日常妆容 #美妆推荐',
          hashtags: ['#眼影盘', '#新手化妆', '#日常妆容', '#美妆推荐'],
          isSelected: true
        }
      ],
      posters: []
    }
  },
  {
    id: 'task_20240223_010',
    name: '运动套装推广',
    status: 'completed',
    type: 'batch',
    progress: 100,
    totalItems: 5,
    completedItems: 5,
    createdAt: '2024-02-23T14:30:00Z',
    completedAt: '2024-02-23T14:45:00Z',
    product: {
      basicInfo: {
        name: '瑜伽运动套装',
        brand: '轻运动',
        category: '女装',
        subCategory: '运动服',
        material: '速干面料',
        color: '黑色/紫色/粉色',
        size: 'S-XL',
        targetAudience: '健身爱好者、瑜伽练习者',
        sellingPoints: '速干透气、高弹舒适、修身显瘦'
      },
      inputAssets: {
        productImages: []
      }
    },
    aiGeneratedResults: {
      titles: [
        { id: 't010', content: '🔥这套运动服太显瘦了！穿上秒变健身博主身材！', style: '爆款风', isSelected: true }
      ],
      copywritings: [
        {
          id: 'c010',
          style: 'douyin_hype',
          styleName: '抖音爆款风',
          title: '健身动力来源！这套运动服绝了！',
          content: '姐妹们！穿上这套运动服，健身都有动力了！\n\n🏃‍♀️速干面料超透气，出汗也不粘身！\n🏃‍♀️高弹力设计，瑜伽拉伸都不勒！\n🏃‍♀️修身版型太显瘦，腰细腿长既视感！\n\n黑色经典百搭，粉色元气满满，都超好看！\n\n#运动套装 #瑜伽服 #健身穿搭 #显瘦穿搭',
          hashtags: ['#运动套装', '#瑜伽服', '#健身穿搭', '#显瘦穿搭'],
          isSelected: true
        }
      ],
      posters: []
    }
  }
]

// 从 localStorage 读取数据
export function getProductTasks(): ProductTask[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('读取 localStorage 失败:', error)
  }
  return []
}

// 保存数据到 localStorage
export function saveProductTasks(tasks: ProductTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.error('保存到 localStorage 失败:', error)
  }
}

// 初始化数据 - 如果 localStorage 为空，使用 Mock 数据
export function initializeStorage(): ProductTask[] {
  const existingTasks = getProductTasks()
  if (existingTasks.length === 0) {
    // localStorage 为空，使用 Mock 数据初始化
    saveProductTasks(mockTasks)
    return mockTasks
  }
  return existingTasks
}

// 添加商品任务
export function addProductTask(task: Omit<ProductTask, 'id' | 'createdAt'>): ProductTask {
  const tasks = getProductTasks()
  
  const newTask: ProductTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  }
  
  const updatedTasks = [newTask, ...tasks]
  saveProductTasks(updatedTasks)
  
  return newTask
}

// 删除商品任务
export function deleteProductTask(taskId: string): boolean {
  const tasks = getProductTasks()
  const filteredTasks = tasks.filter(task => task.id !== taskId)
  
  if (filteredTasks.length === tasks.length) {
    // 没有找到要删除的任务
    return false
  }
  
  saveProductTasks(filteredTasks)
  return true
}

// 更新商品任务
export function updateProductTask(taskId: string, updates: Partial<ProductTask>): ProductTask | null {
  const tasks = getProductTasks()
  const taskIndex = tasks.findIndex(task => task.id === taskId)
  
  if (taskIndex === -1) {
    return null
  }
  
  const updatedTask = {
    ...tasks[taskIndex],
    ...updates
  }
  
  tasks[taskIndex] = updatedTask
  saveProductTasks(tasks)
  
  return updatedTask
}

// 清空所有数据
export function clearAllTasks(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// 导出数据为 JSON
export function exportTasksToJSON(): string {
  const tasks = getProductTasks()
  return JSON.stringify(tasks, null, 2)
}

// 导入 JSON 数据
export function importTasksFromJSON(jsonString: string): boolean {
  try {
    const tasks = JSON.parse(jsonString)
    if (Array.isArray(tasks)) {
      saveProductTasks(tasks)
      return true
    }
  } catch (error) {
    console.error('导入 JSON 失败:', error)
  }
  return false
}
