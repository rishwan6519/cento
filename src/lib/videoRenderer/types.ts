export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface AspectSize {
  width: number;
  height: number;
}

export interface LayerTiming {
  start: number;
  end: number;
  dur: number;
}

export interface TextLayer {
  boxWidth?: number;
  boxHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | string;
  text: string;
  x?: number; // 0.0 - 1.0 (relative percentage)
  y?: number; // 0.0 - 1.0
  size?: number; // font size or badge percentage
  font?: string;
  fontColor?: string;
  bgMode?: 'color' | 'transparent';
  bgColor?: string;
  shape?: 'none' | 'circle' | 'pill' | 'rect' | 'rounded' | 'ribbon' | 'parallelogram' | 'origami';
  fontWeight?: 'normal' | 'bold' | string;
  fontStyle?: 'normal' | 'italic' | string;
  hidden?: boolean;
  border?: string | number;
  borderColor?: string;
  animation?: string;
  animStart?: number;
  animEnd?: number;
  animDur?: number;
}

export interface ProductLayer {
  type?: 'product';
  x?: number;
  y?: number;
  size?: number; // percentage of canvas
  shape?: 'none' | 'rect' | 'rounded' | 'circle' | 'pill' | string;
  borderRadius?: number; // corner radius in % or px
  border?: string | number;
  borderColor?: string;
  borderWidth?: number;
  shadow?: boolean;
  boxWidth?: number;
  boxHeight?: number;
  cropInset?: { top: number; right: number; bottom: number; left: number };
  animation?: string;
  animStart?: number;
  animEnd?: number;
  animDur?: number;
}

export interface LogoLayer {
  type?: 'logo';
  x?: number;
  y?: number;
  size?: number;
  animation?: string;
  animStart?: number;
  animEnd?: number;
  animDur?: number;
}

export interface DecorLayer {
  type?: 'decor';
  url?: string;
  x?: number;
  y?: number;
  size?: number;
  shape?: 'none' | 'rect' | 'rounded' | 'circle' | string;
  borderRadius?: number;
  border?: string | number;
  borderColor?: string;
  borderWidth?: number;
  shadow?: boolean;
  animation?: string;
  animStart?: number;
  animEnd?: number;
  animDur?: number;
}

export interface TemplateLayers {
  product?: ProductLayer;
  logo?: LogoLayer;
  discount?: TextLayer;
  headline?: TextLayer;
  description?: TextLayer;
  validity?: TextLayer;
  footer?: TextLayer;
  decors?: DecorLayer[];
  [key: string]: any;
}

export interface RenderInputFiles {
  backgroundBuffer?: Buffer;
  backgroundPath?: string;
  backgroundUrl?: string;
  aspectBackgrounds?: Record<string, string>;
  productBuffer?: Buffer;
  productPath?: string;
  productUrl?: string;
  logoBuffer?: Buffer;
  logoPath?: string;
  logoUrl?: string;
  musicBuffer?: Buffer;
  musicPath?: string;
  musicUrl?: string;
  decorations?: Array<{ buffer?: Buffer; path?: string }>;
}

export interface RenderOptions {
  jobId: string;
  templateId?: string | number;
  title?: string;
  ratio?: AspectRatio | string;
  resolution?: number; // 360, 720, 1080
  duration?: number; // seconds (default 6 - 12)
  fps?: number; // default 30
  musicFile?: string;
  musicVolume?: number; // 0 - 100
  musicPreset?: 'upbeat_retail' | 'energetic_sale' | 'modern_store' | 'luxury_minimal' | 'none' | string;
  animationStyle?: string;
  files: RenderInputFiles;
  text: {
    headline?: string;
    discount?: string;
    description?: string;
    validity?: string;
    footer?: string;
    tagline?: string;
    price?: string;
    oldPrice?: string;
    cta?: string;
  };
  decorations?: any[];
  layers?: TemplateLayers;
  aspectStore?: Record<string, TemplateLayers>;
  aspectBackgrounds?: Record<string, string>;
  userId?: string;
  offerId?: string;
  channels?: string[];
  voiceoverScript?: string;
  batchSpawn?: boolean;
}

export interface SingleVideoOutput {
  mediaId?: string;
  name?: string;
  ratio: AspectRatio | string;
  width: number;
  height: number;
  duration: number;
  file: string;
  url: string;
  localPath: string;
}

export interface RenderJobResult {
  templateId?: string;
  offerId?: string;
  userId?: string;
  channels?: string[];
  voiceoverScript?: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  primaryVideo?: SingleVideoOutput;
  videos: SingleVideoOutput[];
  message?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
