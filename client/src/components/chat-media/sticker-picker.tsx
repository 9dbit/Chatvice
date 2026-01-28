import { useState, useCallback } from "react";
import { Smile, Heart, PartyPopper, Angry, HandHeart, MessageCircle, Hand, DoorOpen, Laugh, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface Sticker {
  id: string;
  url: string;
  alt: string;
  category: string;
}

interface StickerCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  stickers: Sticker[];
}

const stickerBaseUrl = "https://media.giphy.com/media";

const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: "happy",
    name: "Happy",
    icon: <Smile className="w-4 h-4" />,
    stickers: [
      { id: "happy_1", url: `${stickerBaseUrl}/WUq1cg9K7uzHa/giphy.gif`, alt: "Happy dance", category: "happy" },
      { id: "happy_2", url: `${stickerBaseUrl}/DhstvI3zZ598Nb1rFf/giphy.gif`, alt: "Excited", category: "happy" },
      { id: "happy_3", url: `${stickerBaseUrl}/tXL4FHPSnVJ0A/giphy.gif`, alt: "Jumping happy", category: "happy" },
      { id: "happy_4", url: `${stickerBaseUrl}/5GoVLqeAOo6PK/giphy.gif`, alt: "Yay!", category: "happy" },
      { id: "happy_5", url: `${stickerBaseUrl}/l0MYt5jPR6QX5pnqM/giphy.gif`, alt: "Super happy", category: "happy" },
      { id: "happy_6", url: `${stickerBaseUrl}/xT9IgG50Fb7Mi0prBC/giphy.gif`, alt: "Celebration", category: "happy" },
      { id: "happy_7", url: `${stickerBaseUrl}/3oriNZoNvn73MZaFYk/giphy.gif`, alt: "Thumbs up", category: "happy" },
      { id: "happy_8", url: `${stickerBaseUrl}/l41lUJ1YoZB1lHVPG/giphy.gif`, alt: "So happy", category: "happy" },
      { id: "happy_9", url: `${stickerBaseUrl}/kyLYXonQYYtl6/giphy.gif`, alt: "Jump joy", category: "happy" },
      { id: "happy_10", url: `${stickerBaseUrl}/13dHtsq7BHJJ4s/giphy.gif`, alt: "Smiling", category: "happy" },
    ],
  },
  {
    id: "love",
    name: "Love",
    icon: <Heart className="w-4 h-4" />,
    stickers: [
      { id: "love_1", url: `${stickerBaseUrl}/l4pTfx2qLszoacZRS/giphy.gif`, alt: "Heart eyes", category: "love" },
      { id: "love_2", url: `${stickerBaseUrl}/26BRv0ThflsHCqDrG/giphy.gif`, alt: "Sending love", category: "love" },
      { id: "love_3", url: `${stickerBaseUrl}/l0HlN5Y28D9MzzcRy/giphy.gif`, alt: "Love you", category: "love" },
      { id: "love_4", url: `${stickerBaseUrl}/3oEdv4hwWTzBhWvaU0/giphy.gif`, alt: "Hearts", category: "love" },
      { id: "love_5", url: `${stickerBaseUrl}/MEF1JnhNr66Db0Uk6/giphy.gif`, alt: "Kiss", category: "love" },
      { id: "love_6", url: `${stickerBaseUrl}/l0HlxJMw7rkPTN8sg/giphy.gif`, alt: "Big heart", category: "love" },
      { id: "love_7", url: `${stickerBaseUrl}/3oz8xLd9DJq2l2VFtu/giphy.gif`, alt: "Love animation", category: "love" },
      { id: "love_8", url: `${stickerBaseUrl}/108M7gCS1JSoO4/giphy.gif`, alt: "Blowing kiss", category: "love" },
      { id: "love_9", url: `${stickerBaseUrl}/3oEjHV0z8S7WM4MwnK/giphy.gif`, alt: "Hearts flying", category: "love" },
      { id: "love_10", url: `${stickerBaseUrl}/jErnybNlfE1lm/giphy.gif`, alt: "Hugging", category: "love" },
    ],
  },
  {
    id: "celebrate",
    name: "Celebrate",
    icon: <PartyPopper className="w-4 h-4" />,
    stickers: [
      { id: "celebrate_1", url: `${stickerBaseUrl}/26tOZ42Mg6r8b8iac/giphy.gif`, alt: "Party", category: "celebrate" },
      { id: "celebrate_2", url: `${stickerBaseUrl}/l0MYJnJQ4EiYLxvW/giphy.gif`, alt: "Confetti", category: "celebrate" },
      { id: "celebrate_3", url: `${stickerBaseUrl}/artj92V8o75VPL7AeQ/giphy.gif`, alt: "Cheers", category: "celebrate" },
      { id: "celebrate_4", url: `${stickerBaseUrl}/g9582DNuQppxC/giphy.gif`, alt: "Celebration dance", category: "celebrate" },
      { id: "celebrate_5", url: `${stickerBaseUrl}/kyLYXonQYYtl6/giphy.gif`, alt: "Victory", category: "celebrate" },
      { id: "celebrate_6", url: `${stickerBaseUrl}/3oz9ZE2Oo9zAu/giphy.gif`, alt: "Fireworks", category: "celebrate" },
      { id: "celebrate_7", url: `${stickerBaseUrl}/26u4cqiYI30juCOGY/giphy.gif`, alt: "Dancing", category: "celebrate" },
      { id: "celebrate_8", url: `${stickerBaseUrl}/l378bu6ZYmzS6nBGU/giphy.gif`, alt: "Clapping", category: "celebrate" },
      { id: "celebrate_9", url: `${stickerBaseUrl}/l0Iy5fjHyedk3K0X6/giphy.gif`, alt: "Pop", category: "celebrate" },
      { id: "celebrate_10", url: `${stickerBaseUrl}/26BRDvCpnNmmq4aeY/giphy.gif`, alt: "Yes!", category: "celebrate" },
    ],
  },
  {
    id: "angry",
    name: "Angry",
    icon: <Angry className="w-4 h-4" />,
    stickers: [
      { id: "angry_1", url: `${stickerBaseUrl}/d10dMmzqCYqQ0/giphy.gif`, alt: "Rage", category: "angry" },
      { id: "angry_2", url: `${stickerBaseUrl}/l1J9EdzfOSgfyueLm/giphy.gif`, alt: "Mad", category: "angry" },
      { id: "angry_3", url: `${stickerBaseUrl}/3og0INyCmHlNylks9O/giphy.gif`, alt: "Frustrated", category: "angry" },
      { id: "angry_4", url: `${stickerBaseUrl}/TJawtKM6OCKkvwCIqX/giphy.gif`, alt: "Angry face", category: "angry" },
      { id: "angry_5", url: `${stickerBaseUrl}/l41YqKTI3pFKuI9CE/giphy.gif`, alt: "Steam", category: "angry" },
      { id: "angry_6", url: `${stickerBaseUrl}/3o7P4F86TAI9Kz7XYk/giphy.gif`, alt: "Not happy", category: "angry" },
      { id: "angry_7", url: `${stickerBaseUrl}/3o7WIwkSmw32NgXvTG/giphy.gif`, alt: "Grr", category: "angry" },
      { id: "angry_8", url: `${stickerBaseUrl}/3o6wrvdHFbwBrUFenu/giphy.gif`, alt: "Annoyed", category: "angry" },
      { id: "angry_9", url: `${stickerBaseUrl}/SFkjp1R8gS6lG/giphy.gif`, alt: "Eye roll", category: "angry" },
      { id: "angry_10", url: `${stickerBaseUrl}/xT0GqfvuVpjJbG1A7m/giphy.gif`, alt: "Upset", category: "angry" },
    ],
  },
  {
    id: "thanks",
    name: "Thanks",
    icon: <HandHeart className="w-4 h-4" />,
    stickers: [
      { id: "thanks_1", url: `${stickerBaseUrl}/3oz8xIsloV320wXWE0/giphy.gif`, alt: "Thank you", category: "thanks" },
      { id: "thanks_2", url: `${stickerBaseUrl}/BPJmthQ3YRwD6QqcVD/giphy.gif`, alt: "Grateful", category: "thanks" },
      { id: "thanks_3", url: `${stickerBaseUrl}/26u4b45b8KlgAB7iM/giphy.gif`, alt: "Appreciate", category: "thanks" },
      { id: "thanks_4", url: `${stickerBaseUrl}/3oz8xAFtqoOUUrsh7W/giphy.gif`, alt: "Bow", category: "thanks" },
      { id: "thanks_5", url: `${stickerBaseUrl}/SVgKToBLI6S6DUye1Y/giphy.gif`, alt: "Thanks so much", category: "thanks" },
      { id: "thanks_6", url: `${stickerBaseUrl}/xT9IgMFVMv8p6vFWfe/giphy.gif`, alt: "Bowing", category: "thanks" },
      { id: "thanks_7", url: `${stickerBaseUrl}/l0HlRnAWXfuUAYs0/giphy.gif`, alt: "So grateful", category: "thanks" },
      { id: "thanks_8", url: `${stickerBaseUrl}/3o7TKUZfJKUKuSWTZe/giphy.gif`, alt: "Thank you!", category: "thanks" },
      { id: "thanks_9", url: `${stickerBaseUrl}/11sBLVxNs7IvUY/giphy.gif`, alt: "Thanks!", category: "thanks" },
      { id: "thanks_10", url: `${stickerBaseUrl}/xT1Ra5h24Eliux3UVq/giphy.gif`, alt: "Grateful heart", category: "thanks" },
    ],
  },
  {
    id: "hello",
    name: "Hello",
    icon: <Hand className="w-4 h-4" />,
    stickers: [
      { id: "hello_1", url: `${stickerBaseUrl}/xUPGGDNsLvqsBOhuU0/giphy.gif`, alt: "Wave", category: "hello" },
      { id: "hello_2", url: `${stickerBaseUrl}/l0HlzJVVdlxJPb5Cg/giphy.gif`, alt: "Hi there", category: "hello" },
      { id: "hello_3", url: `${stickerBaseUrl}/3ornk57KwDXf81rjWM/giphy.gif`, alt: "Hello!", category: "hello" },
      { id: "hello_4", url: `${stickerBaseUrl}/3oEdv4hwWTzBhWvaU0/giphy.gif`, alt: "Hey", category: "hello" },
      { id: "hello_5", url: `${stickerBaseUrl}/bcKmIWkUMCjVm/giphy.gif`, alt: "Waving", category: "hello" },
      { id: "hello_6", url: `${stickerBaseUrl}/xT9IgG50Fb7Mi0prBC/giphy.gif`, alt: "Hi!", category: "hello" },
      { id: "hello_7", url: `${stickerBaseUrl}/3oriNZoNvn73MZaFYk/giphy.gif`, alt: "Hello there", category: "hello" },
      { id: "hello_8", url: `${stickerBaseUrl}/ASd0Ukj0y3qMM/giphy.gif`, alt: "Good morning", category: "hello" },
      { id: "hello_9", url: `${stickerBaseUrl}/mGK1g88HZRa2FlKGbz/giphy.gif`, alt: "Greeting", category: "hello" },
      { id: "hello_10", url: `${stickerBaseUrl}/26xBwdIuRCiYhQn/giphy.gif`, alt: "Hey you", category: "hello" },
    ],
  },
  {
    id: "bye",
    name: "Goodbye",
    icon: <DoorOpen className="w-4 h-4" />,
    stickers: [
      { id: "bye_1", url: `${stickerBaseUrl}/xUPGGw7jxnwjk073sA/giphy.gif`, alt: "Bye wave", category: "bye" },
      { id: "bye_2", url: `${stickerBaseUrl}/QRoG9zL4BYHAJ6p/giphy.gif`, alt: "See ya", category: "bye" },
      { id: "bye_3", url: `${stickerBaseUrl}/3o7qDSOvfaCO9b3MlO/giphy.gif`, alt: "Goodbye", category: "bye" },
      { id: "bye_4", url: `${stickerBaseUrl}/42D3CxaINsAFemFuId/giphy.gif`, alt: "Later", category: "bye" },
      { id: "bye_5", url: `${stickerBaseUrl}/l0MYC0LajbaPoEADu/giphy.gif`, alt: "Bye bye", category: "bye" },
      { id: "bye_6", url: `${stickerBaseUrl}/2wKbtCMHTVoOY/giphy.gif`, alt: "Peace out", category: "bye" },
      { id: "bye_7", url: `${stickerBaseUrl}/KRxcgvd5fLiWk/giphy.gif`, alt: "Till next time", category: "bye" },
      { id: "bye_8", url: `${stickerBaseUrl}/XiRDCIwGqPLPl0a7E/giphy.gif`, alt: "Waving bye", category: "bye" },
      { id: "bye_9", url: `${stickerBaseUrl}/3oEjI4sFlp73fvEYgw/giphy.gif`, alt: "See you", category: "bye" },
      { id: "bye_10", url: `${stickerBaseUrl}/lptjRBxFKCJmFoibP/giphy.gif`, alt: "Farewell", category: "bye" },
    ],
  },
  {
    id: "funny",
    name: "Funny",
    icon: <Laugh className="w-4 h-4" />,
    stickers: [
      { id: "funny_1", url: `${stickerBaseUrl}/O5NyCibf93upy/giphy.gif`, alt: "LOL", category: "funny" },
      { id: "funny_2", url: `${stickerBaseUrl}/10JhviFuU2gWD6/giphy.gif`, alt: "Laughing", category: "funny" },
      { id: "funny_3", url: `${stickerBaseUrl}/l41lRKhDjEV5HOt1K/giphy.gif`, alt: "Haha", category: "funny" },
      { id: "funny_4", url: `${stickerBaseUrl}/Z9OGuQyrfHAEOT9/giphy.gif`, alt: "ROFL", category: "funny" },
      { id: "funny_5", url: `${stickerBaseUrl}/3oEjHAUOqG3lSS0f1C/giphy.gif`, alt: "Silly", category: "funny" },
      { id: "funny_6", url: `${stickerBaseUrl}/3o6ZsUJ44ffpnAW7Do/giphy.gif`, alt: "Funny face", category: "funny" },
      { id: "funny_7", url: `${stickerBaseUrl}/l3q2K5jinAlChoCLS/giphy.gif`, alt: "Cracking up", category: "funny" },
      { id: "funny_8", url: `${stickerBaseUrl}/3oKIPc1VNPzL9HkV4g/giphy.gif`, alt: "Troll", category: "funny" },
      { id: "funny_9", url: `${stickerBaseUrl}/fGuqeA6PiXINa/giphy.gif`, alt: "Can't stop", category: "funny" },
      { id: "funny_10", url: `${stickerBaseUrl}/VdWnBa31M6BeY1Iv11/giphy.gif`, alt: "Dead", category: "funny" },
    ],
  },
  {
    id: "cool",
    name: "Cool",
    icon: <Sparkles className="w-4 h-4" />,
    stickers: [
      { id: "cool_1", url: `${stickerBaseUrl}/dIxkmtCuuBQuM9Gy2/giphy.gif`, alt: "Cool", category: "cool" },
      { id: "cool_2", url: `${stickerBaseUrl}/2wYYlHuEw1UcsJYg/giphy.gif`, alt: "Sunglasses", category: "cool" },
      { id: "cool_3", url: `${stickerBaseUrl}/l4pTsh45Dg7jnDM6s/giphy.gif`, alt: "Awesome", category: "cool" },
      { id: "cool_4", url: `${stickerBaseUrl}/d31vTpVi1LAcDvdm/giphy.gif`, alt: "Swagger", category: "cool" },
      { id: "cool_5", url: `${stickerBaseUrl}/xT0GqssRweIhlz209i/giphy.gif`, alt: "Nice", category: "cool" },
      { id: "cool_6", url: `${stickerBaseUrl}/26u4lOMA8JKSnL9Uk/giphy.gif`, alt: "Chill", category: "cool" },
      { id: "cool_7", url: `${stickerBaseUrl}/3ohzdIuqJoo8QdKlnW/giphy.gif`, alt: "Smooth", category: "cool" },
      { id: "cool_8", url: `${stickerBaseUrl}/xT1R9YMZi1GQVP2B2/giphy.gif`, alt: "Epic", category: "cool" },
      { id: "cool_9", url: `${stickerBaseUrl}/l0K4mbH4lKBhAPFU4/giphy.gif`, alt: "Lit", category: "cool" },
      { id: "cool_10", url: `${stickerBaseUrl}/fSYClFsQp1tvP2QFXO/giphy.gif`, alt: "Boss", category: "cool" },
    ],
  },
  {
    id: "sad",
    name: "Sad",
    icon: <MessageCircle className="w-4 h-4" />,
    stickers: [
      { id: "sad_1", url: `${stickerBaseUrl}/d2lcHJTG5Tscg/giphy.gif`, alt: "Crying", category: "sad" },
      { id: "sad_2", url: `${stickerBaseUrl}/L95W4wv8nnb9K/giphy.gif`, alt: "Sad face", category: "sad" },
      { id: "sad_3", url: `${stickerBaseUrl}/6dxhZWZvEqVN6G5/giphy.gif`, alt: "Sobbing", category: "sad" },
      { id: "sad_4", url: `${stickerBaseUrl}/BEob5qwFkSJ7G/giphy.gif`, alt: "Tears", category: "sad" },
      { id: "sad_5", url: `${stickerBaseUrl}/OPU6wzx8JrHna/giphy.gif`, alt: "Depressed", category: "sad" },
      { id: "sad_6", url: `${stickerBaseUrl}/14aUO0Mf7dWDA/giphy.gif`, alt: "Disappointed", category: "sad" },
      { id: "sad_7", url: `${stickerBaseUrl}/3og0INtldac8Wv/giphy.gif`, alt: "Heartbroken", category: "sad" },
      { id: "sad_8", url: `${stickerBaseUrl}/33iqmp5ATXT5m/giphy.gif`, alt: "Why", category: "sad" },
      { id: "sad_9", url: `${stickerBaseUrl}/fQZX2aoRC1Tqw/giphy.gif`, alt: "So sad", category: "sad" },
      { id: "sad_10", url: `${stickerBaseUrl}/3o7TKUM3IgJBX2as9O/giphy.gif`, alt: "Feeling down", category: "sad" },
    ],
  },
];

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onStickerSelect: (sticker: Sticker) => void;
}

export function StickerPicker({
  isOpen,
  onClose,
  onStickerSelect,
}: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[0].id);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleStickerClick = useCallback((sticker: Sticker) => {
    onStickerSelect(sticker);
    onClose();
  }, [onStickerSelect, onClose]);

  const handleImageLoad = useCallback((id: string) => {
    setLoadingStates(prev => ({ ...prev, [id]: false }));
  }, []);

  if (!isOpen) return null;

  const currentCategory = STICKER_CATEGORIES.find(c => c.id === activeCategory) || STICKER_CATEGORIES[0];

  return (
    <div 
      className="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-xl border border-white/30 dark:border-white/20 shadow-xl overflow-hidden z-50"
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
      }}
      data-testid="sticker-picker"
    >
      <style>{`
        .dark [data-testid="sticker-picker"] {
          background-color: rgba(30, 30, 30, 0.92) !important;
        }
      `}</style>
      <div className="flex items-center justify-between p-2 border-b border-black/10 dark:border-white/10">
        <h4 className="text-sm font-medium text-foreground">Stickers</h4>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-6 h-6" 
          onClick={onClose}
          data-testid="button-close-stickers"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-1 p-2 border-b border-black/10 dark:border-white/10">
          {STICKER_CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 h-auto gap-1.5 rounded-lg text-foreground",
                activeCategory === category.id && "bg-primary/20 text-primary"
              )}
              data-testid={`category-${category.id}`}
            >
              {category.icon}
              <span className="text-xs">{category.name}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="h-48 overflow-y-auto p-2">
        <div className="grid grid-cols-5 gap-2">
          {currentCategory.stickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => handleStickerClick(sticker)}
              className="relative aspect-square rounded-lg overflow-hidden hover:bg-black/5 dark:hover:bg-white/10 transition-colors p-1"
              data-testid={`sticker-${sticker.id}`}
            >
              {loadingStates[sticker.id] !== false && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/10 animate-pulse rounded-lg">
                  <Smile className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <img
                src={sticker.url}
                alt={sticker.alt}
                className={cn(
                  "w-full h-full object-contain",
                  loadingStates[sticker.id] !== false && "opacity-0"
                )}
                loading="lazy"
                onLoad={() => handleImageLoad(sticker.id)}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { STICKER_CATEGORIES };
