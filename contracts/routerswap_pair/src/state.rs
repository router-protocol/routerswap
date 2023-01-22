use cw_storage_plus::Item;
use routerswap::asset::PairInfoRaw;

pub const PAIR_INFO: Item<PairInfoRaw> = Item::new("pair_info");
