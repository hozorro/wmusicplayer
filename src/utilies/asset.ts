const imgModules = import.meta.glob('/src/assets/imgs/*.{png,jpg,jpeg,gif,svg}', {
  eager: true,
  query: '?url'
});

export const getAssetImg = (fileName: string) => { 
  const path = `/src/assets/imgs/${fileName}`
  return (imgModules[path] as string) || ''
};