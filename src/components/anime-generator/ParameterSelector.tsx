"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { 
  ChevronDownIcon, 
  SettingsIcon,
  DicesIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// 导入新的子组件
import { CategoryTabs } from "./CategoryTabs";
import { PresetGrid } from "./PresetGrid";

// 类型定义
interface ParameterConfig {
  id: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  prompt_template?: string;
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
}

interface Parameters {
  style: string;
  scene: string;
  outfit: string;
  character: string;
  action: string;
  aspect_ratio: string;
  batch_size: number;
  model_id: string;
  steps: number;
  cfg_scale: number;
  seed?: number;
}

interface ParameterSelectorProps {
  parameters: Parameters;
  onParametersChange: (updates: Partial<Parameters>) => void;
  className?: string;
}

// 预设分类配置
const CATEGORIES = [
  { id: 'character', label: '👤 Character', icon: 'user' },
  { id: 'style', label: '🎨 Style', icon: 'palette' },
  { id: 'action', label: '⚡ Action', icon: 'zap' },
  { id: 'outfit', label: '👗 Outfit', icon: 'shirt' },
  { id: 'scene', label: '🏞️ Scene', icon: 'image' }
];

// 模拟预设数据 - 添加缩略图支持
const MOCK_PRESETS: Record<string, any[]> = {
  character: [
    { id: 'girl', name: '女孩', description: '可爱的动漫女孩', thumbnail: 'https://via.placeholder.com/64x64/FFB6C1/FFFFFF?text=👧' },
    { id: 'boy', name: '男孩', description: '帅气的动漫男孩', thumbnail: 'https://via.placeholder.com/64x64/87CEEB/FFFFFF?text=👦' },
    { id: 'loli', name: 'Loli', description: '萝莉角色', thumbnail: 'https://via.placeholder.com/64x64/FFD1DC/FFFFFF?text=🧚' },
    { id: 'shota', name: '正太', description: '正太角色', thumbnail: 'https://via.placeholder.com/64x64/98FB98/FFFFFF?text=👦' },
  ],
  style: [
    { id: 'miyazaki', name: '宫崎骏风格', description: '温暖治愈的手绘风格', thumbnail: 'https://via.placeholder.com/64x64/90EE90/FFFFFF?text=🎨' },
    { id: '3d_cartoon', name: '3D卡通', description: '现代3D卡通渲染', thumbnail: 'https://via.placeholder.com/64x64/DDA0DD/FFFFFF?text=🎯' },
    { id: 'watercolor', name: '水彩画', description: '柔和的水彩风格', thumbnail: 'https://via.placeholder.com/64x64/F0E68C/FFFFFF?text=🖌️' },
    { id: 'cyberpunk', name: '赛博朋克', description: '未来科幻风格', thumbnail: 'https://via.placeholder.com/64x64/FF1493/FFFFFF?text=⚡' },
    { id: 'traditional', name: '传统绘画', description: '经典手绘风格', thumbnail: 'https://via.placeholder.com/64x64/D2B48C/FFFFFF?text=🖼️' },
    { id: 'pixel_art', name: '像素艺术', description: '复古像素风格', thumbnail: 'https://via.placeholder.com/64x64/8A2BE2/FFFFFF?text=🎮' },
  ],
  action: [
    { id: 'standing', name: '站立', description: '自然站立姿势', thumbnail: 'https://via.placeholder.com/64x64/FF6347/FFFFFF?text=🧍' },
    { id: 'running', name: '跑步', description: '动态跑步姿势', thumbnail: 'https://via.placeholder.com/64x64/32CD32/FFFFFF?text=🏃' },
    { id: 'dancing', name: '跳舞', description: '优雅舞蹈动作', thumbnail: 'https://via.placeholder.com/64x64/FF69B4/FFFFFF?text=💃' },
    { id: 'fighting', name: '战斗', description: '战斗动作姿态', thumbnail: 'https://via.placeholder.com/64x64/DC143C/FFFFFF?text=⚔️' },
  ],
  outfit: [
    { id: 'hanfu', name: '汉服', description: '传统中式汉服', thumbnail: 'https://via.placeholder.com/64x64/FFD700/FFFFFF?text=👘' },
    { id: 'qipao', name: '旗袍', description: '优雅旗袍', thumbnail: 'https://via.placeholder.com/64x64/FF4500/FFFFFF?text=👗' },
    { id: 'jk_uniform', name: 'JK制服', description: '日式校服', thumbnail: 'https://via.placeholder.com/64x64/4169E1/FFFFFF?text=🎒' },
    { id: 'lolita', name: 'Lolita', description: 'Lolita风格服装', thumbnail: 'https://via.placeholder.com/64x64/FFB6C1/FFFFFF?text=🎀' },
    { id: 'modern_casual', name: '现代休闲', description: '现代休闲装', thumbnail: 'https://via.placeholder.com/64x64/20B2AA/FFFFFF?text=👕' },
    { id: 'traditional_kimono', name: '和服', description: '传统日式和服', thumbnail: 'https://via.placeholder.com/64x64/DA70D6/FFFFFF?text=🌸' },
  ],
  scene: [
    { id: 'cherry_blossom', name: '樱花园', description: '浪漫樱花飞舞', thumbnail: 'https://via.placeholder.com/64x64/FFC0CB/FFFFFF?text=🌸' },
    { id: 'mountain_snow', name: '雪山', description: '壮丽雪山景色', thumbnail: 'https://via.placeholder.com/64x64/B0E0E6/FFFFFF?text=⛰️' },
    { id: 'forest', name: '森林', description: '神秘深林场景', thumbnail: 'https://via.placeholder.com/64x64/228B22/FFFFFF?text=🌲' },
    { id: 'city', name: '城市', description: '现代都市风光', thumbnail: 'https://via.placeholder.com/64x64/696969/FFFFFF?text=🏙️' },
    { id: 'beach', name: '海滩', description: '阳光海滩场景', thumbnail: 'https://via.placeholder.com/64x64/00CED1/FFFFFF?text=🏖️' },
    { id: 'temple', name: '神社', description: '传统神社建筑', thumbnail: 'https://via.placeholder.com/64x64/CD853F/FFFFFF?text=⛩️' },
  ]
};

export function ParameterSelector({ 
  parameters, 
  onParametersChange,
  className = ""
}: ParameterSelectorProps) {
  const t = useTranslations("anime-generator");
  
  // 状态管理
  const [activeCategory, setActiveCategory] = useState('character');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [parameterConfigs, setParameterConfigs] = useState<ParameterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化默认参数
  useEffect(() => {
    const defaultParams = {
      ...parameters,
      steps: parameters.steps || 20,
      cfg_scale: parameters.cfg_scale || 7,
      character: parameters.character || '',
      action: parameters.action || '',
    };
    onParametersChange(defaultParams);
    setIsLoading(false);
  }, []);

  // 获取当前分类的预设
  const getCurrentPresets = () => {
    return MOCK_PRESETS[activeCategory] || [];
  };

  // 参数更新处理
  const handleParameterChange = (updates: Partial<Parameters>) => {
    onParametersChange(updates);
  };

  // 随机生成种子值
  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    handleParameterChange({ seed: randomSeed });
  };

  return (
    <Card className={cn("parameter-selector rounded-xl hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-6 space-y-6">
        {/* 标题区域 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Prompt Reference</h3>
          <button className="p-1 rounded-md hover:bg-muted">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
        
        {/* 分类标签导航 */}
        <CategoryTabs
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* 预设选项网格 */}
        <PresetGrid
          category={activeCategory}
          selectedValue={parameters[activeCategory as keyof Parameters] as string}
          onValueChange={(value) => handleParameterChange({ [activeCategory]: value })}
          presets={getCurrentPresets()}
        />

        <Separator />

        {/* 高级参数折叠面板 */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-sm">高级参数</span>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">可选</span>
              </div>
              <ChevronDownIcon className={cn(
                "w-4 h-4 transition-transform text-gray-400",
                isAdvancedOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            {/* 生成步数 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                生成步数: {parameters.steps || 20}
              </label>
              <Slider
                value={[parameters.steps || 20]}
                onValueChange={([value]) => handleParameterChange({ steps: value })}
                min={10}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>快速 (10)</span>
                <span>精细 (50)</span>
              </div>
            </div>

            {/* 引导词强度 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                引导词强度: {parameters.cfg_scale || 7}
              </label>
              <Slider
                value={[parameters.cfg_scale || 7]}
                onValueChange={([value]) => handleParameterChange({ cfg_scale: value })}
                min={1}
                max={20}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>自由 (1)</span>
                <span>严格 (20)</span>
              </div>
            </div>

            {/* 种子值 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                种子值 (可复现)
              </label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={parameters.seed || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    handleParameterChange({ seed: value });
                  }}
                  placeholder="随机生成"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateRandomSeed}
                  className="shrink-0"
                >
                  <DicesIcon className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                相同种子值可生成相似图片
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}