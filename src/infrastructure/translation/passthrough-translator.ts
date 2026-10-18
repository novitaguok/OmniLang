import type { DialectTranslator } from '../../application/ports/dialect-translator.js';
import { resolveLanguageTag } from '../../domain/value-objects/language.js';
import type { LanguageCode } from '../../domain/value-objects/language.js';

/**
 * Demo-mode translator: returns the source text unchanged (tagged so the
 * relay behavior stays visible) and detects language from a small
 * colloquial lexicon. Requires no cloud credentials.
 */
const DEMO_TRANSLATION_RULES: ReadonlyArray<{
  readonly match: RegExp;
  readonly translations: Partial<Record<LanguageCode, string>>;
}> = [
  {
    match: /5個購入希望です.*東京までの送料は/,
    translations: {
      id: 'Halo Kak! Saya tertarik beli 5 lembar. Ongkir ke Tokyo berapa ya?',
      tl: 'Kumusta po! Gusto ko pong bumili ng 5 piraso. Magkano po ang shipping papuntang Tokyo?',
      hi: 'नमस्ते! मैं 5 पीस खरीदना चाहता हूँ। टोक्यो तक शिपिंग का खर्च कितना होगा?',
      en: 'Hello! I would like to purchase 5 pieces. How much is shipping to Tokyo?',
    },
  },
  {
    match: /Siap kak.*135rb.*120\.?000|Bisa.*ongkir sekitar 120rb/i,
    translations: {
      ja: 'はい、在庫ございます！5枚まとめてご購入いただける場合、1枚135,000ルピア（約1,320円）に割引いたします。東京までのEMS送料は120,000ルピア（約1,180円）です。',
      en: 'Yes, we have 5 in stock! For 5 pieces, I can offer a wholesale discount at Rp 135,000 each, plus Rp 120,000 EMS shipping to Tokyo.',
      tl: 'Opo, may stock po! Kung 5 piraso, bigyan ko po kayo ng discount na Rp 135,000 bawat isa, at Rp 120,000 ang EMS shipping.',
      hi: 'जी हाँ, स्टॉक उपलब्ध है! 5 पीस लेने पर विशेष छूट के साथ 135,000 IDR प्रति पीस और 120,000 IDR शिपिंग लगेगा।',
    },
  },
  {
    match: /ありがとうございます.*その条件.*5枚お願いします|決済リンクをお願いします/,
    translations: {
      id: 'Terima kasih banyak! Saya setuju ambil 5 lembar dengan harga diskon & ongkir EMS tersebut. Tolong kirimkan link pembayarannya ya, Kak.',
      tl: 'Maraming salamat po! Kunin ko na po ang 5 piraso sa presyong iyan. Pakipadala na lang po ang payment link.',
      hi: 'बहुत धन्यवाद! मुझे यह डील मंजूर है, कृपया 5 पीस के लिए पेमेंट लिंक भेजें।',
      en: 'Thank you so much! I accept those terms for 5 pieces. Please send the payment link.',
    },
  },
  {
    match: /Magkano po kung 3 piraso.*Manila|kumot.*Ilocos/i,
    translations: {
      en: 'How much for 3 pieces? Can you ship to Manila / Singapore with a bundle discount?',
      ja: '3枚購入するといくらになりますか？マニラ・東京への発送は可能でしょうか？',
      id: 'Halo Kak, kalau beli 3 pcs harganya berapa ya? Bisa kirim ke Manila / luar negeri?',
      hi: 'नमस्ते, 3 पीस की कीमत क्या होगी? क्या आप इसे शिप कर सकते हैं?',
    },
  },
  {
    match: /Pwede po.*1,100.*shipping/i,
    translations: {
      en: 'Sure thing! For 3 Inabel blankets I can give it at ₱1,100 each plus ₱250 express shipping.',
      ja: 'はい、大丈夫です！3枚セットなら1枚1,100ペソに割引し、送料250ペソでお送りできます。',
      id: 'Bisa banget! Untuk 3 selimut Inabel saya kasih ₱1.100 per lembar tambah ongkir ₱250.',
    },
  },
  {
    match: /नमस्ते.*4 पीस चाहिए.*शिपिंग/,
    translations: {
      en: 'Namaste! I would like to order 4 Jaipur block-print throws. What is the shipping cost to Singapore/Tokyo?',
      ja: 'ナマステ！ジャイプールのブロックプリントを4枚注文したいです。送料はいくらですか？',
      id: 'Halo! Saya mau pesan 4 kain block-print Jaipur. Ongkirnya berapa ya?',
      tl: 'Kumusta! Gusto ko pong umorder ng 4 na Jaipur block-print throws. Magkano po ang shipping?',
    },
  },
  {
    match: /जी बिल्कुल.*1,350.*शिपिंग/,
    translations: {
      en: 'Certainly! For 4 pieces we offer a special price of ₹1,350 per piece plus ₹600 international courier shipping.',
      ja: 'かしこまりました！4枚でしたら特別価格で1枚1,350ルピー、国際送料600ルピーでお届けいたします。',
      id: 'Tentu bisa! Untuk 4 pcs kami beri harga spesial ₹1.350 per lembar ditambah ongkir internasional ₹600.',
    },
  },
];

function translateInvoiceSummary(text: string, to: LanguageCode): string | null {
  if (text.startsWith('Order confirmed!')) {
    const lines = text.split('\n');
    const itemLine = lines[0]?.replace('Order confirmed! ', '') ?? '';
    const unitLine = lines[1]?.replace('Unit price: ', '') ?? '';
    const shipLine = lines[2]?.replace('Shipping: ', '') ?? '';
    const totalLine = lines[3]?.replace('Total: ', '') ?? '';
    const payLine = lines[4]?.replace('Pay securely: ', '') ?? '';

    if (to === 'ja') {
      return (
        `🎉 ご注文が確定しました！ (${itemLine})\n` +
        `・単価: ${unitLine}\n` +
        `・送料 (EMS): ${shipLine}\n` +
        `・合計金額: ${totalLine}\n` +
        `💳 安全なクロスボーダー決済リンク: ${payLine}`
      );
    }
    if (to === 'tl') {
      return (
        `🎉 Kumpirmado na po ang order! (${itemLine})\n` +
        `・Presyo bawat isa: ${unitLine}\n` +
        `・Shipping: ${shipLine}\n` +
        `・Kabuuan: ${totalLine}\n` +
        `💳 Magbayad nang ligtas dito: ${payLine}`
      );
    }
    if (to === 'hi') {
      return (
        `🎉 आपका ऑर्डर कन्फर्म हो गया है! (${itemLine})\n` +
        `・प्रति पीस कीमत: ${unitLine}\n` +
        `・शिपिंग शुल्क: ${shipLine}\n` +
        `・कुल राशि: ${totalLine}\n` +
        `💳 सुरक्षित पेमेंट लिंक: ${payLine}`
      );
    }
  }

  if (text.startsWith('A new order just closed!')) {
    const lines = text.split('\n');
    const itemLine = lines[1] ?? '';
    const unitLine = lines[2]?.replace('Unit price: ', '') ?? '';
    const shipLine = lines[3]?.replace('Shipping: ', '') ?? '';
    const totalLine = lines[4]?.replace('Buyer invoice total: ', '') ?? '';
    const payLine = lines[5]?.replace('The payment link has been sent to the buyer: ', '') ?? '';

    if (to === 'id') {
      return (
        `🎉 Pesanan baru berhasil ditutup! Berikut rinciannya:\n` +
        `📦 ${itemLine}\n` +
        `・Harga satuan (diskon): ${unitLine}\n` +
        `・Ongkir internasional: ${shipLine}\n` +
        `💰 Total tagihan pembeli: ${totalLine}\n` +
        `🔗 Link pembayaran sudah dikirim ke pembeli: ${payLine}`
      );
    }
    if (to === 'tl') {
      return (
        `🎉 May bagong order na naisara! Narito ang detalye:\n` +
        `📦 ${itemLine}\n` +
        `・Presyo bawat piraso: ${unitLine}\n` +
        `・Shipping fee: ${shipLine}\n` +
        `💰 Kabuuang babayaran ng buyer: ${totalLine}\n` +
        `🔗 Naipadala na ang payment link sa buyer: ${payLine}`
      );
    }
    if (to === 'hi') {
      return (
        `🎉 बधाई हो! एक नया ऑर्डर पूरा हो गया है:\n` +
        `📦 ${itemLine}\n` +
        `・इकाई मूल्य: ${unitLine}\n` +
        `・शिपिंग शुल्क: ${shipLine}\n` +
        `💰 कुल इनवॉइस राशि: ${totalLine}\n` +
        `🔗 खरीदार को पेमेंट लिंक भेज दिया गया है: ${payLine}`
      );
    }
  }

  return null;
}

export class PassthroughDialectTranslator implements DialectTranslator {
  async translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
    if (from === to) {
      return text;
    }

    const invoiceTranslation = translateInvoiceSummary(text, to);
    if (invoiceTranslation) {
      return invoiceTranslation;
    }

    for (const rule of DEMO_TRANSLATION_RULES) {
      if (rule.match.test(text) && rule.translations[to]) {
        return rule.translations[to]!;
      }
    }

    return `[${to}] ${text}`;
  }

  async detectLanguage(text: string): Promise<LanguageCode> {
    const lexicon: Record<LanguageCode, readonly RegExp[]> = {
      id: [/\b(halo|berapa|mau|jual|bisa|ongkir|rb|ribu|keranjang|batik|banget|dong|siap|kak|lembar)\b/i],
      tl: [/\b(magkano|pwede|totoo|bili|tayo|lang|po|piraso|kumot|benta|opo)\b/i],
      hi: [/[\u0900-\u097f]/, /\b(कीमत|कितना|बेचना|नमस्ते)\b/],
      vi: [/\b(bao|nhieu|ban|toi|khong)\b/i],
      ja: [/[\u3040-\u30ff]/, /[\u4e00-\u9faf]/],
      en: [/\b(hello|price|how much|buy|sell|shipping|pieces|discount)\b/i],
    };
    for (const [language, patterns] of Object.entries(lexicon) as [LanguageCode, readonly RegExp[]][]) {
      if (patterns.some((pattern) => pattern.test(text))) {
        return language;
      }
    }
    return resolveLanguageTag('en')!;
  }
}
