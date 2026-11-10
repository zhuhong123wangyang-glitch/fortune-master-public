export async function loadIztro() {
  try {
    const imported=await import('iztro');
    const astro=imported.astro||imported.default?.astro;
    if(typeof astro?.bySolar!=='function')throw new Error('iztro astro.bySolar API 不存在，请检查依赖版本');
    return {astro};
  } catch(error){
    if(error.code==='ERR_MODULE_NOT_FOUND'||String(error).includes('Cannot find package'))
      throw new Error('缺少紫微库 iztro。请在项目目录执行 npm install --ignore-scripts --no-audit --no-fund（首次需联网）');
    throw error;
  }
}
