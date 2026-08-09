# Eski Bravo Mobile → TelMax migratsiyasi

Eski MySQL bazasi o‘zgartirilmaydi. Avval to‘liq SQL backup olinadi, keyin vaqtinchalik Neon branchga import qilinadi.

Asosiy mapping: `mijozlar → customers/users`, `telefonlar → products + inventory_units/purchase_batches`, `telefon_olishlar → purchase_batches`, `sotuvlar → sales + sale_items`, `xarajatlar → expenses`, `amallar_tarixi → audit_logs`, `tugmali_miqdor_tarixi → inventory_movements`.

Android va iOS `SMARTPHONE`, Tugmali `FEATURE_PHONE` bo‘ladi. Sensorli telefonning har bir qatori individual inventory unit; tugmali telefonlar xarid narxi va sanasi bo‘yicha batchga aylanadi. Eski `birlik_xarid_narxi` sotuv tannarxi snapshoti sifatida saqlanadi. Yangi sotuvlarda FIFO ishlatiladi.

Tekshiruv: har kategoriya bo‘yicha telefon soni, mavjud miqdor, sotuvlar soni, jami savdo, qarz, xarajat va investitsiyalar eski hamda yangi bazada solishtiriladi. Barcha farqlar nol bo‘lmaguncha production cutover bajarilmaydi.
