export const locales = ["en", "zh", "it", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "ourpets-locale";

export type Messages = typeof messages.en;

const messages = {
  en: {
    meta: {
      appDescription: "A social platform to share and explore pets.",
      homeDescription:
        "Post your pets and discover new ones!",
      petFallbackTitle: "Pet",
      petDescription: "posted by",
    },
    common: {
      total: "total",
      loading: "Loading…",
      unknown: "Unknown",
      account: "Account",
      user: "User",
      somethingWentWrong: "Something went wrong",
      save: "Save",
      cancel: "Cancel",
    },
    languages: {
      en: "English",
      zh: "中文",
      it: "Italiano",
      es: "Español",
    },
    header: {
      home: "Home",
      discover: "Discover",
      explore: "Explore",
      addPet: "Add pet",
      profile: "Profile",
      signIn: "Sign in",
      signOut: "Sign out",
      toggleTheme: "Toggle theme",
      language: "Language",
    },
    home: {
      eyebrow: "Pet community",
      title: "OurPets",
      description:
        "Post your pets and discover new ones!",
      supporting: "A quieter home for beautiful pet stories, thoughtful discovery, and lightweight social moments.",
    },
    discover: {
      title: "Discover pets",
      description: "Browse the latest posts, switch categories, and surface the pets people love most.",
      browseLabel: "Discover",
      categoryLabel: "Category",
      sortLabel: "Sort",
      latest: "Latest",
      popular: "Popular",
    },
    feed: {
      searchPlaceholder: "Search pets by name…",
      refresh: "Refresh",
      all: "All",
      dogs: "Dogs",
      cats: "Cats",
      other: "Other",
      empty: "No pets yet. Be the first to add one.",
      end: "You've reached the end.",
      failedToLoad: "Failed to load pets",
    },
    petCard: {
      owner: "Owner",
      likes: "likes",
      comments: "comments",
    },
    petDetail: {
      signInToLike: "Please sign in to like pets.",
      failedToUpdateLike: "Failed to update like",
      petDeleted: "Pet deleted",
      failedToDelete: "Failed to delete",
      edit: "Edit",
      delete: "Delete",
      deleteConfirm: "Delete this pet? This cannot be undone.",
      galleryAlt: "photo",
    },
    comments: {
      title: "Comments",
      writePlaceholder: "Write a comment…",
      signInPlaceholder: "Sign in to comment…",
      post: "Post",
      commentAdded: "Comment added",
      signInToComment: "Please sign in to comment.",
      failedToAdd: "Failed to add comment",
      commentDeleted: "Comment deleted",
      failedToDelete: "Failed to delete comment",
      empty: "No comments yet.",
      deleteLabel: "Delete comment",
      loadMore: "Load more",
    },
    form: {
      createTitle: "Add a pet",
      editTitle: "Edit pet",
      description: "Add a great photo and a short description. Images are stored on Cloudinary.",
      name: "Name",
      namePlaceholder: "e.g. Mochi",
      age: "Age",
      type: "Type",
      dog: "Dog",
      cat: "Cat",
      other: "Other",
      descriptionLabel: "Description",
      descriptionPlaceholder: "What makes them special?",
      images: "Images",
      addOneImage: "Add at least 1 image.",
      petCreated: "Pet created",
      petUpdated: "Pet updated",
      failedToSave: "Failed to save pet",
      maxImages: "You can upload up to 8 images.",
      imagesUploaded: "Images uploaded",
      uploadFailed: "Upload failed",
      removeImage: "Remove image",
      create: "Create",
      saveChanges: "Save changes",
      saving: "Saving…",
    },
    profile: {
      title: "Profile",
      description: "Update your display name and manage your pets.",
      displayName: "Display name",
      signedInAs: "Signed in as",
      profileUpdated: "Profile updated",
      failedToUpdate: "Failed to update profile",
      yourPets: "Your pets",
      empty: "You haven't added any pets yet.",
    },
  },
  zh: {
    meta: {
      appDescription: "一个分享与探索宠物的社交平台。",
      homeDescription: "发布你的宠物并发现伙伴！",
      petFallbackTitle: "宠物",
      petDescription: "发布者",
    },
    common: {
      total: "总数",
      loading: "加载中…",
      unknown: "未知",
      account: "账户",
      user: "用户",
      somethingWentWrong: "出了点问题",
      save: "保存",
      cancel: "取消",
    },
    languages: {
      en: "English",
      zh: "中文",
      it: "Italiano",
      es: "Español",
    },
    header: {
      home: "首页",
      discover: "发现",
      explore: "发现",
      addPet: "添加宠物",
      profile: "个人资料",
      signIn: "登录",
      signOut: "退出登录",
      toggleTheme: "切换主题",
      language: "语言",
    },
    home: {
      eyebrow: "宠物社区",
      title: "OurPets",
      description: "一个简洁现代的宠物社交动态，分享你喜爱的宠物，也发现更多可爱的伙伴。",
      supporting: "更轻盈地展示品牌、内容与互动，让浏览路径更清晰，也让每一次发现更自然。",
    },
    discover: {
      title: "发现宠物",
      description: "浏览最新内容，切换分类，并快速查看最受欢迎的宠物动态。",
      browseLabel: "内容浏览",
      categoryLabel: "分类",
      sortLabel: "排序",
      latest: "最新",
      popular: "热门",
    },
    feed: {
      searchPlaceholder: "按名字搜索宠物…",
      refresh: "刷新",
      all: "全部",
      dogs: "狗狗",
      cats: "猫咪",
      other: "其他",
      empty: "还没有宠物，快来第一个发布吧。",
      end: "已经到底了。",
      failedToLoad: "加载宠物失败",
    },
    petCard: {
      owner: "主人",
      likes: "点赞",
      comments: "评论",
    },
    petDetail: {
      signInToLike: "请先登录再点赞。",
      failedToUpdateLike: "更新点赞失败",
      petDeleted: "宠物已删除",
      failedToDelete: "删除失败",
      edit: "编辑",
      delete: "删除",
      deleteConfirm: "确定要删除这只宠物吗？此操作无法撤销。",
      galleryAlt: "照片",
    },
    comments: {
      title: "评论",
      writePlaceholder: "写点评论…",
      signInPlaceholder: "登录后才能评论…",
      post: "发布",
      commentAdded: "评论已发布",
      signInToComment: "请先登录再评论。",
      failedToAdd: "评论发布失败",
      commentDeleted: "评论已删除",
      failedToDelete: "删除评论失败",
      empty: "还没有评论。",
      deleteLabel: "删除评论",
      loadMore: "加载更多",
    },
    form: {
      createTitle: "添加宠物",
      editTitle: "编辑宠物",
      description: "上传好看的照片并写一段简短介绍。图片会存储在 Cloudinary。",
      name: "名字",
      namePlaceholder: "例如：Mochi",
      age: "年龄",
      type: "类型",
      dog: "狗狗",
      cat: "猫咪",
      other: "其他",
      descriptionLabel: "描述",
      descriptionPlaceholder: "它有什么特别之处？",
      images: "图片",
      addOneImage: "至少添加 1 张图片。",
      petCreated: "宠物已创建",
      petUpdated: "宠物已更新",
      failedToSave: "保存宠物失败",
      maxImages: "最多只能上传 8 张图片。",
      imagesUploaded: "图片上传成功",
      uploadFailed: "上传失败",
      removeImage: "移除图片",
      create: "创建",
      saveChanges: "保存更改",
      saving: "保存中…",
    },
    profile: {
      title: "个人资料",
      description: "更新你的显示名称并管理你的宠物。",
      displayName: "显示名称",
      signedInAs: "当前登录邮箱",
      profileUpdated: "资料已更新",
      failedToUpdate: "更新资料失败",
      yourPets: "你的宠物",
      empty: "你还没有添加任何宠物。",
    },
  },
  it: {
    meta: {
      appDescription: "Una piattaforma social per condividere ed esplorare animali domestici.",
      homeDescription:
        "Un feed social minimale e moderno per condividere gli animali che ami e scoprirne di nuovi.",
      petFallbackTitle: "Animale",
      petDescription: "pubblicato da",
    },
    common: {
      total: "totale",
      loading: "Caricamento…",
      unknown: "Sconosciuto",
      account: "Account",
      user: "Utente",
      somethingWentWrong: "Qualcosa è andato storto",
      save: "Salva",
      cancel: "Annulla",
    },
    languages: {
      en: "English",
      zh: "中文",
      it: "Italiano",
      es: "Español",
    },
    header: {
      home: "Home",
      discover: "Scopri",
      explore: "Esplora",
      addPet: "Aggiungi animale",
      profile: "Profilo",
      signIn: "Accedi",
      signOut: "Esci",
      toggleTheme: "Cambia tema",
      language: "Lingua",
    },
    home: {
      eyebrow: "Community per animali",
      title: "OurPets",
      description:
        "Un feed social minimale e moderno per condividere gli animali che ami e scoprirne di nuovi.",
      supporting:
        "Uno spazio più chiaro per il brand, la scoperta e interazioni leggere tra persone che amano gli animali.",
    },
    discover: {
      title: "Scopri animali",
      description: "Sfoglia i post più recenti, cambia categoria e metti in evidenza gli animali più apprezzati.",
      browseLabel: "Esplora",
      categoryLabel: "Categoria",
      sortLabel: "Ordina",
      latest: "Più recenti",
      popular: "Popolari",
    },
    feed: {
      searchPlaceholder: "Cerca animali per nome…",
      refresh: "Aggiorna",
      all: "Tutti",
      dogs: "Cani",
      cats: "Gatti",
      other: "Altro",
      empty: "Nessun animale per ora. Aggiungine uno tu.",
      end: "Hai raggiunto la fine.",
      failedToLoad: "Impossibile caricare gli animali",
    },
    petCard: {
      owner: "Proprietario",
      likes: "mi piace",
      comments: "commenti",
    },
    petDetail: {
      signInToLike: "Accedi per mettere mi piace.",
      failedToUpdateLike: "Impossibile aggiornare il mi piace",
      petDeleted: "Animale eliminato",
      failedToDelete: "Impossibile eliminare",
      edit: "Modifica",
      delete: "Elimina",
      deleteConfirm: "Eliminare questo animale? L'azione non può essere annullata.",
      galleryAlt: "foto",
    },
    comments: {
      title: "Commenti",
      writePlaceholder: "Scrivi un commento…",
      signInPlaceholder: "Accedi per commentare…",
      post: "Pubblica",
      commentAdded: "Commento aggiunto",
      signInToComment: "Accedi per commentare.",
      failedToAdd: "Impossibile aggiungere il commento",
      commentDeleted: "Commento eliminato",
      failedToDelete: "Impossibile eliminare il commento",
      empty: "Nessun commento.",
      deleteLabel: "Elimina commento",
      loadMore: "Carica altro",
    },
    form: {
      createTitle: "Aggiungi animale",
      editTitle: "Modifica animale",
      description:
        "Aggiungi una bella foto e una breve descrizione. Le immagini vengono archiviate su Cloudinary.",
      name: "Nome",
      namePlaceholder: "es. Mochi",
      age: "Età",
      type: "Tipo",
      dog: "Cane",
      cat: "Gatto",
      other: "Altro",
      descriptionLabel: "Descrizione",
      descriptionPlaceholder: "Cosa lo rende speciale?",
      images: "Immagini",
      addOneImage: "Aggiungi almeno 1 immagine.",
      petCreated: "Animale creato",
      petUpdated: "Animale aggiornato",
      failedToSave: "Impossibile salvare l'animale",
      maxImages: "Puoi caricare fino a 8 immagini.",
      imagesUploaded: "Immagini caricate",
      uploadFailed: "Caricamento non riuscito",
      removeImage: "Rimuovi immagine",
      create: "Crea",
      saveChanges: "Salva modifiche",
      saving: "Salvataggio…",
    },
    profile: {
      title: "Profilo",
      description: "Aggiorna il tuo nome visualizzato e gestisci i tuoi animali.",
      displayName: "Nome visualizzato",
      signedInAs: "Accesso effettuato come",
      profileUpdated: "Profilo aggiornato",
      failedToUpdate: "Impossibile aggiornare il profilo",
      yourPets: "I tuoi animali",
      empty: "Non hai ancora aggiunto animali.",
    },
  },
  es: {
    meta: {
      appDescription: "Una plataforma social para compartir y descubrir mascotas.",
      homeDescription:
        "Un feed social minimalista y moderno para compartir las mascotas que amas y descubrir nuevas.",
      petFallbackTitle: "Mascota",
      petDescription: "publicado por",
    },
    common: {
      total: "total",
      loading: "Cargando…",
      unknown: "Desconocido",
      account: "Cuenta",
      user: "Usuario",
      somethingWentWrong: "Algo salió mal",
      save: "Guardar",
      cancel: "Cancelar",
    },
    languages: {
      en: "English",
      zh: "中文",
      it: "Italiano",
      es: "Español",
    },
    header: {
      home: "Inicio",
      discover: "Descubrir",
      explore: "Explorar",
      addPet: "Agregar mascota",
      profile: "Perfil",
      signIn: "Iniciar sesión",
      signOut: "Cerrar sesión",
      toggleTheme: "Cambiar tema",
      language: "Idioma",
    },
    home: {
      eyebrow: "Comunidad de mascotas",
      title: "OurPets",
      description: "Publica tus mascotas y descubre nuevas!",
      supporting:
        "Un espacio más claro para presentar la marca, descubrir historias y moverte por el contenido con calma.",
    },
    discover: {
      title: "Descubrir mascotas",
      description: "Explora las publicaciones más recientes, cambia de categoría y destaca las mascotas más populares.",
      browseLabel: "Descubrir",
      categoryLabel: "Categoría",
      sortLabel: "Ordenar",
      latest: "Recientes",
      popular: "Populares",
    },
    feed: {
      searchPlaceholder: "Buscar mascotas por nombre…",
      refresh: "Actualizar",
      all: "Todas",
      dogs: "Perros",
      cats: "Gatos",
      other: "Otro",
      empty: "Aún no hay mascotas. Sé la primera persona en agregar una.",
      end: "Has llegado al final.",
      failedToLoad: "No se pudieron cargar las mascotas",
    },
    petCard: {
      owner: "Dueño",
      likes: "me gusta",
      comments: "comentarios",
    },
    petDetail: {
      signInToLike: "Inicia sesión para dar me gusta.",
      failedToUpdateLike: "No se pudo actualizar el me gusta",
      petDeleted: "Mascota eliminada",
      failedToDelete: "No se pudo eliminar",
      edit: "Editar",
      delete: "Eliminar",
      deleteConfirm: "¿Eliminar esta mascota? Esta acción no se puede deshacer.",
      galleryAlt: "foto",
    },
    comments: {
      title: "Comentarios",
      writePlaceholder: "Escribe un comentario…",
      signInPlaceholder: "Inicia sesión para comentar…",
      post: "Publicar",
      commentAdded: "Comentario agregado",
      signInToComment: "Inicia sesión para comentar.",
      failedToAdd: "No se pudo agregar el comentario",
      commentDeleted: "Comentario eliminado",
      failedToDelete: "No se pudo eliminar el comentario",
      empty: "Todavía no hay comentarios.",
      deleteLabel: "Eliminar comentario",
      loadMore: "Cargar más",
    },
    form: {
      createTitle: "Agregar mascota",
      editTitle: "Editar mascota",
      description:
        "Agrega una gran foto y una descripción breve. Las imágenes se almacenan en Cloudinary.",
      name: "Nombre",
      namePlaceholder: "p. ej. Mochi",
      age: "Edad",
      type: "Tipo",
      dog: "Perro",
      cat: "Gato",
      other: "Otro",
      descriptionLabel: "Descripción",
      descriptionPlaceholder: "¿Qué la hace especial?",
      images: "Imágenes",
      addOneImage: "Agrega al menos 1 imagen.",
      petCreated: "Mascota creada",
      petUpdated: "Mascota actualizada",
      failedToSave: "No se pudo guardar la mascota",
      maxImages: "Puedes subir hasta 8 imágenes.",
      imagesUploaded: "Imágenes subidas",
      uploadFailed: "La carga falló",
      removeImage: "Quitar imagen",
      create: "Crear",
      saveChanges: "Guardar cambios",
      saving: "Guardando…",
    },
    profile: {
      title: "Perfil",
      description: "Actualiza tu nombre para mostrar y administra tus mascotas.",
      displayName: "Nombre para mostrar",
      signedInAs: "Sesión iniciada como",
      profileUpdated: "Perfil actualizado",
      failedToUpdate: "No se pudo actualizar el perfil",
      yourPets: "Tus mascotas",
      empty: "Todavía no has agregado mascotas.",
    },
  },
} satisfies Record<Locale, Record<string, unknown>>;

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase();

  if (isLocale(normalized)) return normalized;

  const baseLocale = normalized.split("-")[0];
  if (isLocale(baseLocale)) return baseLocale;

  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("es")) return "es";

  return defaultLocale;
}

export function detectLocaleFromAcceptLanguage(headerValue: string | null | undefined): Locale {
  if (!headerValue) return defaultLocale;

  const accepted = headerValue
    .split(",")
    .map((item) => item.split(";")[0]?.trim())
    .filter(Boolean);

  for (const candidate of accepted) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return defaultLocale;
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export function getPetTypeLabel(locale: Locale, type: "DOG" | "CAT" | "OTHER") {
  const formMessages = getMessages(locale).form;
  if (type === "DOG") return formMessages.dog;
  if (type === "CAT") return formMessages.cat;
  return formMessages.other;
}

export function formatPetAge(locale: Locale, age: number) {
  const pr = new Intl.PluralRules(locale);
  const unitByLocale: Record<Locale, Record<Intl.LDMLPluralRule, string>> = {
    en: { zero: "years", one: "year", two: "years", few: "years", many: "years", other: "years" },
    zh: { zero: "岁", one: "岁", two: "岁", few: "岁", many: "岁", other: "岁" },
    it: { zero: "anni", one: "anno", two: "anni", few: "anni", many: "anni", other: "anni" },
    es: { zero: "años", one: "año", two: "años", few: "años", many: "años", other: "años" },
  };
  const rule = pr.select(age);
  const unit = unitByLocale[locale][rule] ?? unitByLocale[locale].other;

  if (locale === "zh") return `${age}${unit}`;

  return `${age} ${unit}`;
}

export function formatCompactLabel(locale: Locale, value: number, unit: string) {
  if (locale === "zh") return `${value}${unit}`;
  return `${value} ${unit}`;
}

export function formatDateTime(locale: Locale, value: string | Date) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
