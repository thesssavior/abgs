export type Locale = "ko" | "en";

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "ko";
  return navigator.language?.startsWith("ko") ? "ko" : "en";
}

export function detectLocaleFromHeader(acceptLanguage: string): Locale {
  return acceptLanguage.startsWith("ko") || acceptLanguage.includes("ko-KR")
    ? "ko"
    : "en";
}

const t = {
  // Landing page
  chatWith: { ko: "와 대화하기", en: "Chat with " },
  age: { ko: "세", en: "y/o" },

  // Chat header
  online: { ko: "접속중", en: "Online" },

  // Chat input
  sendMessage: { ko: (name: string) => `${name}에게 메시지 보내기...`, en: (name: string) => `Message ${name}...` },

  // Photo request
  sendPhoto: { ko: "사진 보내줘", en: "Send a photo" },
  photoResponse: { ko: "이거 너만 보는 거야 ㅎ", en: "This is just for you ;)" },
  tapToUnlock: { ko: "탭하여 잠금 해제", en: "Tap to unlock" },

  // Paywall
  premiumContent: { ko: "프리미엄 콘텐츠", en: "Premium Content" },
  premiumDesc: { ko: "사진을 보려면 프리미엄 구독이 필요해요", en: "Unlock premium to see photos" },
  originalPrice: { ko: "₩13,900", en: "$9.99" },
  salePrice: { ko: "₩4,900", en: "$4" },
  discountEndsIn: { ko: "할인 종료까지", en: "Offer ends in" },
  discountEndingSoon: { ko: "할인이 곧 종료됩니다", en: "Offer ending soon" },
  checkoutLoading: { ko: "결제 준비 중...", en: "Preparing checkout..." },
  unlock: { ko: "잠금 해제 - ₩4,900", en: "Unlock - $4" },
  restoreDesc: { ko: "다른 브라우저나 기기에서는 결제한 이메일로 복원할 수 있어요", en: "Restore your purchase on another browser or device with your email" },
  restoreEmail: { ko: "결제에 사용한 이메일", en: "Email used for purchase" },
  restoring: { ko: "복원 중...", en: "Restoring..." },
  restorePurchase: { ko: "구매 복원", en: "Restore purchase" },
  maybeLater: { ko: "나중에 할게", en: "Maybe later" },

  // Premium messages
  premiumConfirmed: { ko: "결제가 확인됐어요. 프리미엄이 열렸어.", en: "Payment confirmed. Premium unlocked!" },
  premiumCanceled: { ko: "결제가 취소됐어요. 준비되면 다시 잠금 해제해줘.", en: "Payment canceled. Unlock when you're ready." },
  premiumCheckFailed: { ko: "프리미엄 상태를 확인하지 못했어. 잠시 후 다시 시도해줘.", en: "Couldn't check premium status. Try again later." },
  premiumRestored: { ko: "구매 내역을 복원했어.", en: "Purchase restored." },
  premiumRestoreFailed: { ko: "구매 내역을 복원하지 못했어.", en: "Couldn't restore purchase." },
  checkoutFailed: { ko: "결제 화면을 열지 못했어. 잠시 후 다시 시도해줘.", en: "Couldn't open checkout. Try again later." },

  // Errors
  wsDisconnected: { ko: "연결이 끊겼어. 잠시 후 다시 보내줘~", en: "Connection lost. Try again in a moment~" },
  wsTimeout: { ko: "응답이 늦어지고 있어. 다시 보내줘~", en: "Response is taking too long. Try again~" },
  genericError: { ko: "앗 잠깐 끊겼어ㅠㅠ 다시 보내줘~", en: "Oops, lost connection. Try again~" },
} as const;

export type TranslationKey = keyof typeof t;

export function msg(key: TranslationKey, locale: Locale): string | ((...args: string[]) => string) {
  return t[key][locale] as string | ((...args: string[]) => string);
}

export function s(key: TranslationKey, locale: Locale): string {
  return t[key][locale] as string;
}

export function fn(key: "sendMessage", locale: Locale): (name: string) => string {
  return t[key][locale] as (name: string) => string;
}
