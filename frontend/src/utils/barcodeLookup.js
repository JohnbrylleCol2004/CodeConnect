function errorMessage(result, fallback) {
  return result.reason?.response?.data?.error || result.reason?.response?.data?.detail || fallback;
}

export function resolveBarcodeLookup(localResult, externalResult) {
  let local;
  if (localResult.status === 'fulfilled') {
    local = { status: 'found', product: localResult.value.data.product };
  } else if (localResult.reason?.response?.status === 404) {
    local = { status: 'missing' };
  } else {
    local = { status: 'error', message: errorMessage(localResult, 'FreshFlow lookup failed.') };
  }

  let external;
  if (externalResult.status === 'fulfilled') {
    const data = externalResult.value.data;
    external = data?.found ? { status: 'found', product: data } : { status: 'missing', message: data?.message };
  } else if (externalResult.reason?.response?.status === 404) {
    external = { status: 'missing', message: errorMessage(externalResult, 'Product not found in Open Food Facts registry.') };
  } else {
    external = { status: 'error', message: errorMessage(externalResult, 'Open Food Facts lookup failed.') };
  }

  const fill = local.status === 'found' ? local.product : external.status === 'found' ? external.product : null;
  const mismatch = local.status === 'found' && external.status === 'found' &&
    local.product.name.trim().toLocaleLowerCase() !== external.product.name.trim().toLocaleLowerCase();

  return { local, external, fill, mismatch };
}
