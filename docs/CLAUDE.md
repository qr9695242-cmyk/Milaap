# Project Rule — Full File Edits Only

**Rule:** Jab bhi is project ki kisi bhi file mein koi change / fix / update kiya jaaye, us file ko **poori (complete)** likh kar dena hai — sirf changed lines, snippet, ya partial diff nahi.

## Kyun
- Isse file kabhi corrupt ya incomplete state mein save nahi hogi.
- Copy-paste karte waqt user ko sirf ek hi complete file milegi, usse purani file ke sath manually merge nahi karna padega.
- Missing imports, half-written functions, ya broken syntax ka risk khatam ho jaata hai.

## Is Rule Ko Follow Karne Ka Tareeka
1. Jis file mein change karna hai, pehle uska current poora content dekho.
2. Required change us content mein apply karo.
3. Output / save hamesha **us file ka pura content** ho — top se bottom tak, saare imports, saare functions, sab kuch included.
4. Sirf ek chhota sa "diff" ya "yeh line change karo" wala jawab kabhi mat do.

## Scope
Yeh rule is poore `worksec/` project ki har file (`.js`, `.jsx`, `.json`, `.rules`, `.md`, etc.) par lagu hoti hai — chahe change chhota ho ya bada.
