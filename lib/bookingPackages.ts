export const PACKAGE_BOOKING_PREFIX = "pkg:";

export type BookingServiceRow = {
  id: string;
  nume_serviciu: string;
  price?: number | string | null;
  duration?: number | string | null;
};

export type BookingPackageRow = {
  id: string;
  name: string;
  description?: string | null;
  service_ids?: string[] | null;
  work_location_ids?: string[] | null;
  price?: number | string | null;
  active?: boolean | string | null;
  valid_from?: string | null;
  valid_until?: string | null;
};

export type BookableServiceRow = {
  id: string;
  nume_serviciu: string;
  price: number;
  duration: number;
  is_package?: boolean;
  package_id?: string;
  package_service_ids?: string[];
  package_work_location_ids?: string[];
};

export function isPackageBookingId(id?: string | null) {
  return String(id || "").startsWith(PACKAGE_BOOKING_PREFIX);
}

export function getPackageIdFromBookingId(id: string) {
  return id.slice(PACKAGE_BOOKING_PREFIX.length);
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {}
  return trimmed
    .replace(/[{}[\]"]/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPackageActive(pkg: BookingPackageRow, today: string) {
  if (pkg.active === false) return false;
  if (typeof pkg.active === "string" && ["false", "0", "no"].includes(pkg.active.toLowerCase())) return false;
  if (pkg.valid_from && pkg.valid_from > today) return false;
  if (pkg.valid_until && pkg.valid_until < today) return false;
  return true;
}

export function buildBookableServices(
  services: BookingServiceRow[],
  packages: BookingPackageRow[] = [],
  today = new Date().toISOString().split("T")[0],
): BookableServiceRow[] {
  const baseServices = services.map((service) => ({
    id: service.id,
    nume_serviciu: service.nume_serviciu,
    price: toNumber(service.price),
    duration: toNumber(service.duration),
  }));
  const serviceById = new Map(baseServices.map((service) => [service.id, service]));

  const packageServices = packages
    .filter((pkg) => isPackageActive(pkg, today))
    .map((pkg) => {
      const ids = toStringArray(pkg.service_ids);
      const included = ids.map((id) => serviceById.get(id)).filter(Boolean) as BookableServiceRow[];
      if (ids.length === 0 || included.length !== ids.length) return null;
      const regularPrice = included.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = included.reduce((sum, service) => sum + service.duration, 0);
      return {
        id: `${PACKAGE_BOOKING_PREFIX}${pkg.id}`,
        nume_serviciu: `Pachet: ${pkg.name}`,
        price: toNumber(pkg.price) || regularPrice,
        duration: totalDuration || 30,
        is_package: true,
        package_id: pkg.id,
        package_service_ids: ids,
        package_work_location_ids: toStringArray(pkg.work_location_ids),
      };
    })
    .filter(Boolean) as BookableServiceRow[];

  return [...packageServices, ...baseServices];
}

export function getUnderlyingServiceIds(item?: Pick<BookableServiceRow, "id" | "package_service_ids"> | null) {
  if (!item) return [];
  return item.package_service_ids?.length ? item.package_service_ids : [item.id];
}

export function isBookableAllowedAtLocation(
  item: Pick<BookableServiceRow, "id" | "package_service_ids" | "package_work_location_ids">,
  locationServiceIds?: string[] | null,
  locationId?: string | null,
) {
  if (item.package_work_location_ids?.length && locationId && !item.package_work_location_ids.includes(locationId)) return false;
  if (!locationServiceIds?.length) return true;
  return getUnderlyingServiceIds(item).every((serviceId) => locationServiceIds.includes(serviceId));
}

export function isBookableOfferedByStaff(
  item: Pick<BookableServiceRow, "id" | "package_service_ids">,
  staffServices?: string[] | null,
) {
  if (!staffServices?.length) return true;
  return getUnderlyingServiceIds(item).every((serviceId) => staffServices.includes(serviceId));
}
