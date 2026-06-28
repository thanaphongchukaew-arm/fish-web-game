# 🐠 ตู้ปลาของฉัน

เกมเลี้ยงปลาแบบ browser-based เปิดไฟล์ `index.html` ในเบราว์เซอร์แล้วเล่นได้เลย ไม่ต้องติดตั้งหรือรัน server ใดๆ

---

## โครงสร้างไฟล์

```
FishGame/
├── index.html
├── style.css
├── game.js
└── README.md
```

---

### `index.html`
ไฟล์หลักที่เปิดในเบราว์เซอร์ มีหน้าที่กำหนดโครงสร้าง HTML ของหน้าเกมทั้งหมด ประกอบด้วย

- **Header** — แถบแสดงสถิติ (วันที่, เวลา, เหรียญ, จำนวนปลา, รางวัล)
- **Tank** — wrapper ของ `<canvas>` พร้อม overlay แสดงความสกปรกและอาหารที่เลือก
- **Controls** — ปุ่มหลัก 4 ปุ่ม (ให้อาหาร, ทำความสะอาด, ร้านค้า, ผสมพันธุ์)
- **Fish Grid** — พื้นที่แสดงการ์ดสถิติปลาแต่ละตัว
- **Shop Modal** — หน้าต่างร้านค้า (ซ่อนอยู่ เปิดเมื่อกดปุ่มร้านค้า)
- **Toast / Achievement** — container สำหรับ notification และป๊อปอัปรางวัล
- โหลด `style.css` ผ่าน `<link>` และโหลด `game.js` ผ่าน `<script src>` ที่ท้าย body

---

### `style.css`
ไฟล์จัดการหน้าตาและ animation ทั้งหมด แบ่งเป็นส่วนหลักดังนี้

| ส่วน | รายละเอียด |
|---|---|
| `body` | พื้นหลังสีน้ำเงินเข้ม จัดวาง layout แนวตั้งกึ่งกลางหน้า |
| `.header` / `.chip` | แถบสถิติด้านบน มี backdrop blur |
| `.tank-wrap` | กรอบตู้ปลา มี border glow และ inset shadow |
| `.dirty-badge` / `.dirty-fill` | แถบแสดงความสะอาดของตู้ในมุมบนขวาของตู้ |
| `.food-badge` | badge แสดงอาหารที่กำลังใช้ในมุมล่างขวาของตู้ |
| `.btn` / `.btn-*` | ปุ่มหลัก 4 แบบ (feed/clean/shop/breed) พร้อม hover และ disabled state |
| `.fish-card` / `.bar-*` | การ์ดสถิติปลา มี animation `pulse` เมื่อปลาวิกฤต |
| `.overlay` / `.modal` | Shop modal และปุ่มปิดมุมบนขวา |
| `.shop-*` | รายการสินค้าในร้านค้า |
| `.toast` | notification ลอยขวาบน มี animation slide in |
| `#achPopup` | ป๊อปอัปรางวัล ลอยล่างกลาง มี bounce animation |

---

### `game.js`
ไฟล์ logic เกมทั้งหมด เขียนด้วย Vanilla JavaScript แบ่งเป็นส่วนดังนี้

| ส่วน | รายละเอียด |
|---|---|
| **CONFIG (`C`)** | ค่าคงที่ของเกม เช่น ขนาด canvas, ระยะเวลา 1 วัน, อัตราการหิว/สกปรก/สุขภาพ |
| **STATE** | object เก็บสถานะทั้งหมดของเกม (วัน, เหรียญ, ปลา, particles, ของตกแต่ง, รางวัล) |
| **FISH DATA** | ข้อมูลปลา 6 สายพันธุ์ (สี body/tail, ความเร็ว) และชื่อสุ่ม 18 ชื่อ |
| **`makeFish(type)`** | สร้าง object ปลาใหม่ พร้อม position สุ่ม, ค่าสถิติเริ่มต้น, และ physics |
| **Particles** | `pFood()` สร้างอาหาร, `pBubble()` สร้างฟอง, `pFx()` สร้าง effect (หัวใจ/ประกาย/หยดน้ำ) |
| **Draw functions** | `drawBackground()` วาดพื้นหลัง+แสง, `drawFloor()` วาดพื้นทราย+หิน, `drawSeaweed()` วาดสาหร่าย, `drawDecors()` วาดของตกแต่ง, `drawFish()` วาดปลาด้วย canvas 2D, `drawParticles()` วาด particle ทั้งหมด, `drawDirtyOverlay()` วาดคราบสกปรก |
| **`render()`** | เรียก draw functions ทั้งหมดตามลำดับทุก frame |
| **`updateFishAI()`** | AI ปลา — ตรวจหาอาหารใกล้เคียง, ว่ายไปกิน, wander สุ่ม, หันหน้าตามทิศ |
| **`gameTick()`** | อัปเดต state ทุก frame — เลื่อน particle, คำนวณความหิว/สุขภาพ/ความสุข, นับวัน, หาเหรียญ |
| **`onNewDay()`** | เพิ่มอายุปลา, อัปเดต stage, แสดง toast ต้อนรับวันใหม่ |
| **`updateStage()`** | คำนวณ stage และ size ปลาตามอายุ (baby → juvenile → adult → elder) |
| **`feedFish(x)`** | โยน particle อาหารลงตู้ตำแหน่ง x ที่กำหนด |
| **`cleanTank()`** | ลดความสกปรก 75%, เพิ่มความสุขปลา, spawn bubble effect |
| **`breedFish()`** | สร้างลูกปลาใหม่จากปลาโตที่มีอยู่, spawn heart effect |
| **SHOP (`SHOP`)** | ข้อมูลสินค้า 3 หมวด (ปลา, อาหาร, ของตกแต่ง) และ functions `openShop()`, `buyFish()`, `buyFood()`, `selectFood()`, `buyDecor()` |
| **`updateUI()`** | อัปเดต header, dirty bar, และสร้าง HTML ของการ์ดปลาทุก frame |
| **`petFish(id)`** | เพิ่มความสุขปลาเมื่อกดการ์ด, spawn heart effect |
| **ACHIEVEMENTS** | array เงื่อนไข 9 รางวัล และ `checkAch()` ตรวจสอบทุก tick |
| **`toast()`** | สร้าง notification ชั่วคราว พร้อม fade out อัตโนมัติ |
| **Event Handlers** | click ลูบปลาใน canvas, contextmenu โยนอาหาร, setInterval แจ้งเตือนทุก 28 วินาที |
| **`loop()`** | main game loop ด้วย `requestAnimationFrame` |
| **`init()`** | เริ่มเกม — สร้างปลาเริ่มต้น, วางของตกแต่ง, ยิง toast ต้อนรับ |

---

## วิธีเล่น

| การกระทำ | วิธี |
|---|---|
| ให้อาหาร | กดปุ่ม **ให้อาหาร** หรือ **คลิกขวา** ในตู้ |
| ลูบหัวปลา | **คลิก** ที่ตัวปลาในตู้ หรือคลิกที่การ์ดปลา |
| ทำความสะอาด | กดปุ่ม **ทำความสะอาด** |
| ผสมพันธุ์ | กดปุ่ม **ผสมพันธุ์** (ต้องมีปลาโตอย่างน้อย 2 ตัว) |
| ซื้อของ | กดปุ่ม **ร้านค้า** |

> **หมายเหตุ:** เกมนี้ไม่มีระบบ save ข้อมูลจะหายเมื่อรีเฟรชหน้า
# fish-web-game
