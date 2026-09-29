import type { Dhikr, Sequence } from './types'

export const PRESET_DHIKRS: Dhikr[] = [
  { id: 'subhanallah', name: 'SubhanAllah', arabic: 'سُبْحَانَ ٱللَّٰهِ', meaning: 'Glory be to Allah', target: 33 },
  { id: 'alhamdulillah', name: 'Alhamdulillah', arabic: 'ٱلْحَمْدُ لِلَّٰهِ', meaning: 'All praise is due to Allah', target: 33 },
  { id: 'allahuakbar', name: 'Allahu Akbar', arabic: 'ٱللَّٰهُ أَكْبَرُ', meaning: 'Allah is the Greatest', target: 34 },
  { id: 'astaghfirullah', name: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ', meaning: 'I seek forgiveness from Allah', target: 100 },
  { id: 'tahlil', name: 'La ilaha illallah', arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', meaning: 'There is no god but Allah', target: 100 },
  {
    id: 'subhanallahi-wabihamdihi',
    name: 'SubhanAllahi wa bihamdihi',
    arabic: 'سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ',
    meaning: 'Glory be to Allah and praise be to Him',
    target: 100,
  },
  {
    id: 'salawat',
    name: 'Salawat',
    arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    meaning: 'O Allah, send blessings upon Muhammad',
    target: 100,
  },
]

export const PRESET_SEQUENCES: Sequence[] = [
  {
    id: 'after-salah',
    name: 'After Salah',
    steps: [
      { dhikrId: 'subhanallah', target: 33 },
      { dhikrId: 'alhamdulillah', target: 33 },
      { dhikrId: 'allahuakbar', target: 34 },
    ],
  },
]
