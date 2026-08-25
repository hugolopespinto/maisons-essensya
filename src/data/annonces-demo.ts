import type { VitahomeAnnonce, VitahomeMedia } from "@/lib/vitahome/types";

/* Jeu de démo AU FORMAT PASSERELLE Vitahome (onglet DONNEES FLUX).
   Il traverse le vrai AnnoncesAdapter.map() → le câblage est prouvé
   même sans accès au flux réel (repli hors-ligne / preview).
   racine { reference, price, title, description, media[], land{}, house{}|false }
   land.latitude/longitude = String · postCode = Number (spec Vitahome) */
const IMG = {
  land1:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop",
  land2:"https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1200&auto=format&fit=crop",
  land3:"https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?q=80&w=1200&auto=format&fit=crop"
};
const media = (id: number, path: string, name: string): VitahomeMedia => ({ id, name, path, type: "image", slug: String(id) });


export const LOCAL_ANNONCES_RAW: VitahomeAnnonce[] = [
  {
    reference:"ES-1001", price:289000,
    title:"Terrain + Essen à Montpellier",
    description:"À l'ouest de Montpellier, dans un quartier résidentiel calme à 15 minutes du centre, ce terrain plat de 420 m² accueille le modèle Essen dans sa configuration 3 chambres. Exposition sud-ouest, viabilisation complète, écoles et commerces à pied.",
    media:[ media(1,"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop","essen-montpellier") ],
    land:{ id:9001, price:130000, surface:420, isServicing:"Terrain viabilisé", landConfiguration:"Plat", landType:"Lotissement", landState:"Disponible",
      city:"Montpellier", cityId:34172, citySlug:"montpellier", postCode:34070, longitude:"3.87", latitude:"43.61", inseeCode:"34172",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:1, agencySlug:"montpellier", agencyName:"Agence de Montpellier", agencyPhone:"04 67 00 00 00", agencyEmail:"montpellier@essensya.fr",
      agencyAdresse:"12 av. de la Méditerranée", agencyPostcode:"34000", agencyCity:"Montpellier", media:[] },
    house:{ id:501, name:"Essen 92", slug:"essen-92", model:"Essen", modelSlug:"essen", area:92, bedroomNumber:3, roomNumber:4,
      adImage:{ path:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop" }, media:[] }
  },
  {
    reference:"ES-1002", price:145000,
    title:"Terrain à Sète — la Corniche",
    description:"Sur les hauteurs de la Corniche, terrain viabilisé de 512 m² avec vue dégagée. Compatible avec l'ensemble des modèles de la collection. Étude d'implantation offerte.",
    media:[ media(2,IMG.land1,"terrain-sete") ],
    land:{ id:9002, price:145000, surface:512, isServicing:"Terrain viabilisé", landConfiguration:"Pente douce", landType:"Diffus", landState:"Disponible",
      city:"Sète", cityId:34301, citySlug:"sete", postCode:34200, longitude:"3.70", latitude:"43.40", inseeCode:"34301",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:2, agencySlug:"sete", agencyName:"Agence du Bassin de Thau", agencyPhone:"04 67 00 00 01", agencyEmail:"thau@essensya.fr",
      agencyAdresse:"3 quai de la Résistance", agencyPostcode:"34200", agencyCity:"Sète", media:[] },
    house:false
  },
  {
    reference:"ES-1003", price:254000,
    title:"Terrain + Nova à Frontignan",
    description:"À 10 minutes de la plage, parcelle compacte idéale pour le modèle Nova et sa terrasse couverte. Le premier achat malin sur le bassin de Thau.",
    media:[ media(3,"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop","nova-frontignan") ],
    land:{ id:9003, price:112000, surface:350, isServicing:"Terrain viabilisé", landConfiguration:"Plat", landType:"Lotissement", landState:"Disponible",
      city:"Frontignan", cityId:34108, citySlug:"frontignan", postCode:34110, longitude:"3.75", latitude:"43.45", inseeCode:"34108",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:2, agencySlug:"sete", agencyName:"Agence du Bassin de Thau", agencyPhone:"04 67 00 00 01", agencyEmail:"thau@essensya.fr",
      agencyAdresse:"3 quai de la Résistance", agencyPostcode:"34200", agencyCity:"Sète", media:[] },
    house:{ id:503, name:"Nova 78", slug:"nova-78", model:"Nova", modelSlug:"nova", area:78, bedroomNumber:2, roomNumber:3,
      adImage:{ path:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop" }, media:[] }
  },
  {
    reference:"ES-1004", price:315000,
    title:"Terrain + Alba à Gigean",
    description:"Au pied du massif de la Gardiole, terrain de 480 m² parfaitement orienté pour le modèle Alba : pièces de vie au sud, jardin préservé. Village avec écoles, à 20 minutes de Montpellier et de Sète.",
    media:[ media(4,"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop","alba-gigean") ],
    land:{ id:9004, price:126000, surface:480, isServicing:"Terrain viabilisé", landConfiguration:"Plat", landType:"Lotissement", landState:"Disponible",
      city:"Gigean", cityId:34113, citySlug:"gigean", postCode:34770, longitude:"3.71", latitude:"43.50", inseeCode:"34113",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:1, agencySlug:"montpellier", agencyName:"Agence de Montpellier", agencyPhone:"04 67 00 00 00", agencyEmail:"montpellier@essensya.fr",
      agencyAdresse:"12 av. de la Méditerranée", agencyPostcode:"34000", agencyCity:"Montpellier", media:[] },
    house:{ id:502, name:"Alba 104", slug:"alba-104", model:"Alba", modelSlug:"alba", area:104, bedroomNumber:4, roomNumber:5,
      adImage:{ path:"https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop" }, media:[] }
  },
  {
    reference:"ES-1005", price:128000,
    title:"Terrain à Mèze",
    description:"À deux pas de l'étang de Thau, terrain de 395 m² dans un secteur pavillonnaire recherché. Compatible Essen et Nova. Viabilisation en bordure.",
    media:[ media(5,IMG.land2,"terrain-meze") ],
    land:{ id:9005, price:128000, surface:395, isServicing:"Viabilisation en bordure", landConfiguration:"Plat", landType:"Diffus", landState:"Disponible",
      city:"Mèze", cityId:34157, citySlug:"meze", postCode:34140, longitude:"3.60", latitude:"43.42", inseeCode:"34157",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:2, agencySlug:"sete", agencyName:"Agence du Bassin de Thau", agencyPhone:"04 67 00 00 01", agencyEmail:"thau@essensya.fr",
      agencyAdresse:"3 quai de la Résistance", agencyPostcode:"34200", agencyCity:"Sète", media:[] },
    house:false
  },
  {
    reference:"ES-1006", price:298000,
    title:"Terrain + Essen à Fabrègues",
    description:"Entre vignes et garrigue, offre terrain + Essen dans un lotissement à taille humaine. Dernier lot disponible avec cette orientation.",
    media:[ media(6,"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop","essen-fabregues") ],
    land:{ id:9006, price:138000, surface:410, isServicing:"Terrain viabilisé", landConfiguration:"Plat", landType:"Lotissement", landState:"Disponible",
      city:"Fabrègues", cityId:34095, citySlug:"fabregues", postCode:34690, longitude:"3.77", latitude:"43.55", inseeCode:"34095",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:1, agencySlug:"montpellier", agencyName:"Agence de Montpellier", agencyPhone:"04 67 00 00 00", agencyEmail:"montpellier@essensya.fr",
      agencyAdresse:"12 av. de la Méditerranée", agencyPostcode:"34000", agencyCity:"Montpellier", media:[] },
    house:{ id:501, name:"Essen 92", slug:"essen-92", model:"Essen", modelSlug:"essen", area:92, bedroomNumber:3, roomNumber:4,
      adImage:{ path:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop" }, media:[] }
  },
  {
    reference:"ES-1007", price:139000,
    title:"Terrain à Poussan",
    description:"Terrain plat de 445 m² en sortie de village, exposition sud. Compatible avec tous les modèles de la collection, y compris Alba avec garage intégré.",
    media:[ media(7,IMG.land3,"terrain-poussan") ],
    land:{ id:9007, price:139000, surface:445, isServicing:"Terrain viabilisé", landConfiguration:"Plat", landType:"Diffus", landState:"Disponible",
      city:"Poussan", cityId:34213, citySlug:"poussan", postCode:34560, longitude:"3.67", latitude:"43.49", inseeCode:"34213",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:2, agencySlug:"sete", agencyName:"Agence du Bassin de Thau", agencyPhone:"04 67 00 00 01", agencyEmail:"thau@essensya.fr",
      agencyAdresse:"3 quai de la Résistance", agencyPostcode:"34200", agencyCity:"Sète", media:[] },
    house:false
  },
  {
    reference:"ES-1008", price:342000,
    title:"Terrain + Alba à Balaruc-le-Vieux",
    description:"Belle parcelle de 520 m² dominant le bassin, configurée pour le modèle Alba 4 chambres. Vue, calme et commodités du village.",
    media:[ media(8,"https://images.unsplash.com/photo-1600585152915-d208bec867a1?q=80&w=1200&auto=format&fit=crop","alba-balaruc") ],
    land:{ id:9008, price:152500, surface:520, isServicing:"Terrain viabilisé", landConfiguration:"Pente douce", landType:"Diffus", landState:"Disponible",
      city:"Balaruc-le-Vieux", cityId:34024, citySlug:"balaruc-le-vieux", postCode:34540, longitude:"3.68", latitude:"43.44", inseeCode:"34024",
      departmentName:"Hérault", inseeDepartmentCode:"34",
      agencyId:2, agencySlug:"sete", agencyName:"Agence du Bassin de Thau", agencyPhone:"04 67 00 00 01", agencyEmail:"thau@essensya.fr",
      agencyAdresse:"3 quai de la Résistance", agencyPostcode:"34200", agencyCity:"Sète", media:[] },
    house:{ id:502, name:"Alba 104", slug:"alba-104", model:"Alba", modelSlug:"alba", area:104, bedroomNumber:4, roomNumber:5,
      adImage:{ path:"https://images.unsplash.com/photo-1600585152915-d208bec867a1?q=80&w=1200&auto=format&fit=crop" }, media:[] }
  }
];
