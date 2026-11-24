/* ================= RAL COLOURS: the RAL Classic chart (number, name, an on-screen colour) for picking glass colours ================= */
export { RAL_FAMILIES, RAL_LIST, ralFind };
/* James (Nov 2026): "for the coloured glass you have the RAL number, could we have all the RAL colours to see to choose
   from". The RAL Classic colours with their usual English names. The on-screen colours are close approximations –
   a screen can't show a paint or glass colour exactly, so the picker says to check against a real sample. */
const RAL_TXT = `1000 Green beige #CDBA88
1001 Beige #D0B084
1002 Sand yellow #D2AA6D
1003 Signal yellow #F9A800
1004 Golden yellow #E49E00
1005 Honey yellow #CB8E00
1006 Maize yellow #E29000
1007 Daffodil yellow #E88C00
1011 Brown beige #AF804F
1012 Lemon yellow #DDAF27
1013 Oyster white #E3D9C6
1014 Ivory #DDC49A
1015 Light ivory #E6D2B5
1016 Sulfur yellow #F1DD38
1017 Saffron yellow #F6A950
1018 Zinc yellow #FACA30
1019 Grey beige #A48F7A
1020 Olive yellow #A08F65
1021 Rape yellow #F6B600
1023 Traffic yellow #F7B500
1024 Ochre yellow #BA8F4C
1026 Luminous yellow #FFFF00
1027 Curry #A77F0E
1028 Melon yellow #FF9B00
1032 Broom yellow #E2A300
1033 Dahlia yellow #F99A1C
1034 Pastel yellow #EB9C52
1035 Pearl beige #908370
1036 Pearl gold #80643F
1037 Sun yellow #F09200
2000 Yellow orange #DA6E00
2001 Red orange #BA481B
2002 Vermilion #BF3922
2003 Pastel orange #F67828
2004 Pure orange #E25303
2005 Luminous orange #FF4D06
2007 Luminous bright orange #FFB200
2008 Bright red orange #ED6B21
2009 Traffic orange #DE5307
2010 Signal orange #D05D28
2011 Deep orange #E26E0E
2012 Salmon orange #D5654D
2013 Pearl orange #923E25
2017 RAL orange #FC5500
3000 Flame red #A72920
3001 Signal red #9B2423
3002 Carmine red #9B2321
3003 Ruby red #861A22
3004 Purple red #6B1C23
3005 Wine red #59191F
3007 Black red #3E2022
3009 Oxide red #6D342D
3011 Brown red #792423
3012 Beige red #C6846D
3013 Tomato red #972E25
3014 Antique pink #CB7375
3015 Light pink #D8A0A6
3016 Coral red #A63D30
3017 Rose #CA555D
3018 Strawberry red #C63F4A
3020 Traffic red #BB1F11
3022 Salmon pink #CF6955
3024 Luminous red #FF2D21
3026 Luminous bright red #FF2A1C
3027 Raspberry red #AB273C
3028 Pure red #CC2C24
3031 Orient red #A63437
3032 Pearl ruby red #701D24
3033 Pearl pink #A53A2E
4001 Red lilac #816183
4002 Red violet #8D3C4B
4003 Heather violet #C4618C
4004 Claret violet #651E38
4005 Blue lilac #76689A
4006 Traffic purple #903373
4007 Purple violet #47243C
4008 Signal violet #844C82
4009 Pastel violet #9D8692
4010 Telemagenta #BC4077
4011 Pearl violet #6E6387
4012 Pearl blackberry #6B6B7F
5000 Violet blue #314F6F
5001 Green blue #0F4C64
5002 Ultramarine blue #00387B
5003 Sapphire blue #1F3855
5004 Black blue #191E28
5005 Signal blue #005387
5007 Brilliant blue #376B8C
5008 Grey blue #2B3A44
5009 Azure blue #225F78
5010 Gentian blue #004F7C
5011 Steel blue #1A2B3C
5012 Light blue #0089B6
5013 Cobalt blue #193153
5014 Pigeon blue #637D96
5015 Sky blue #007CAF
5017 Traffic blue #005B8C
5018 Turquoise blue #048B8C
5019 Capri blue #005E83
5020 Ocean blue #00414B
5021 Water blue #007577
5022 Night blue #222D5A
5023 Distant blue #42698C
5024 Pastel blue #6093AC
5025 Pearl gentian blue #21697C
5026 Pearl night blue #0F3052
6000 Patina green #3C7460
6001 Emerald green #366735
6002 Leaf green #325928
6003 Olive green #50533C
6004 Blue green #024442
6005 Moss green #114232
6006 Grey olive #3C392E
6007 Bottle green #2C3222
6008 Brown green #37342A
6009 Fir green #27352A
6010 Grass green #4D6F39
6011 Reseda green #6C7C59
6012 Black green #303D3A
6013 Reed green #7D765A
6014 Yellow olive #474135
6015 Black olive #3D3D36
6016 Turquoise green #00694C
6017 May green #587F40
6018 Yellow green #61993B
6019 Pastel green #B9CEAC
6020 Chrome green #37422F
6021 Pale green #8A9977
6022 Olive drab #3A3327
6024 Traffic green #008351
6025 Fern green #5E6E3B
6026 Opal green #005F4E
6027 Light green #7EBAB5
6028 Pine green #315442
6029 Mint green #006F3D
6032 Signal green #237F52
6033 Mint turquoise #46877F
6034 Pastel turquoise #7AACAC
6035 Pearl green #194D25
6036 Pearl opal green #04574B
6037 Pure green #008B29
6038 Luminous green #00B51A
6039 Fibrous green #B3C43E
7000 Squirrel grey #7A888E
7001 Silver grey #8C969D
7002 Olive grey #817863
7003 Moss grey #7A7669
7004 Signal grey #9B9B9B
7005 Mouse grey #6C6E6B
7006 Beige grey #766A5E
7008 Khaki grey #745E3D
7009 Green grey #5D6058
7010 Tarpaulin grey #585C56
7011 Iron grey #52595D
7012 Basalt grey #575D5E
7013 Brown grey #575044
7015 Slate grey #4F5358
7016 Anthracite grey #383E42
7021 Black grey #2F3234
7022 Umbra grey #4C4A44
7023 Concrete grey #808076
7024 Graphite grey #45494E
7026 Granite grey #374345
7030 Stone grey #928E85
7031 Blue grey #5B686D
7032 Pebble grey #B5B0A1
7033 Cement grey #7F8274
7034 Yellow grey #92886F
7035 Light grey #C5C7C4
7036 Platinum grey #979392
7037 Dusty grey #7A7B7A
7038 Agate grey #B0B0A9
7039 Quartz grey #6B665E
7040 Window grey #989EA1
7042 Traffic grey A #8E9291
7043 Traffic grey B #4F5250
7044 Silk grey #B7B3A8
7045 Telegrey 1 #8D9295
7046 Telegrey 2 #7F868A
7047 Telegrey 4 #C8C8C7
7048 Pearl mouse grey #817B73
8000 Green brown #89693E
8001 Ochre brown #9D622B
8002 Signal brown #794D3E
8003 Clay brown #7E4B26
8004 Copper brown #8D4931
8007 Fawn brown #70452A
8008 Olive brown #724A25
8011 Nut brown #5A3826
8012 Red brown #66332B
8014 Sepia brown #4A3526
8015 Chestnut brown #5E2F26
8016 Mahogany brown #4C2B20
8017 Chocolate brown #442F29
8019 Grey brown #3D3635
8022 Black brown #1A1718
8023 Orange brown #A45729
8024 Beige brown #795038
8025 Pale brown #755847
8028 Terra brown #513A2A
8029 Pearl copper #7F4031
9001 Cream #E9E0D2
9002 Grey white #D6D5CB
9003 Signal white #ECECE7
9004 Signal black #2B2B2C
9005 Jet black #0E0E10
9006 White aluminium #A1A1A0
9007 Grey aluminium #878581
9010 Pure white #F1ECE1
9011 Graphite black #27292B
9012 Clean room white #F8F2E1
9016 Traffic white #F1F0EA
9017 Traffic black #2A292A
9018 Papyrus white #C8CBC4
9022 Pearl light grey #858583
9023 Pearl dark grey #797B7A`;
const RAL_LIST = RAL_TXT.split("\n").map((l) => {
  const m = l.match(/^(\d{4}) (.+) (#[0-9A-F]{6})$/);
  return { code: m[1], name: m[2], hex: m[3] };
});
const RAL_FAMILIES = [
  ["1", "Yellows & beiges"],
  ["2", "Oranges"],
  ["3", "Reds & pinks"],
  ["4", "Violets"],
  ["5", "Blues"],
  ["6", "Greens"],
  ["7", "Greys"],
  ["8", "Browns"],
  ["9", "Whites & blacks"],
];
/* "RAL 9010 Pure white" (or a typed "9010" / "ral9010") → its entry, or null */
function ralFind(s) {
  const m = String(s || "").match(/(?:^|ral\s*)(\d{4})\b/i);
  return m ? RAL_LIST.find((r) => r.code === m[1]) || null : null;
}
