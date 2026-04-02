import { useContext, useEffect, useReducer, useRef } from "react";
import { useFlexSearch } from "react-use-flexsearch";
import {
  searchContextDispatch,
  searchContextState,
  incrementPage,
} from "../contexts/searchContext";
import { PubliccodeLite } from "../utils/proptypes";
import { ALPHABETICAL, RELEASE_DATE, VITALITY } from "../utils/constants";

enum ActionType {
  ADD_ITEMS,
  SET_ITEMS,
  SET_IS_LOADING,
  SET_ERROR,
}
interface ActionAddItems {
  type: ActionType.ADD_ITEMS;
  value: { items: Store[] };
}
interface ActionSetItems {
  type: ActionType.SET_ITEMS;
  value: { items: Store[]; total: number };
}
interface ActionSetIsLoading {
  type: ActionType.SET_IS_LOADING;
}
interface ActionSetError {
  type: ActionType.SET_ERROR;
  value: { errorMessage: string };
}

type Actions = ActionAddItems | ActionSetItems | ActionSetIsLoading | ActionSetError;

interface State {
  isLoading: boolean;
  errorMessage?: string | null;
  items: Store[];
  total: number;
}
interface Store {
  id: string;
  publiccode: PubliccodeLite;
}

const initial: State = { isLoading: false, errorMessage: null, items: [], total: 0 };

const reducer = (state: State, action: Actions) => {
  if (action.type === ActionType.ADD_ITEMS)
    return { ...state, isLoading: false, items: [...state.items, ...action.value.items] };
  if (action.type === ActionType.SET_ITEMS)
    return { isLoading: false, items: action.value.items, total: action.value.total };
  if (action.type === ActionType.SET_IS_LOADING)
    return { ...state, isLoading: true };
  if (action.type === ActionType.SET_ERROR)
    return { ...state, isLoading: false, errorMessage: action.value.errorMessage };
  return state;
};

const areMoreItemsAvailable = (from: number, size: number, total: number) =>
  from + size < total;

interface UseSearchEngineOptions {
  pageSize?: number;
  index: string;
  store: Record<string, Store>;
  allSoftware: Store[];
}

export const useSearchEngine = ({
  pageSize = 12,
  index,
  store,
  allSoftware,
}: UseSearchEngineOptions) => {
  const [{ items, total, isLoading, errorMessage }, dispatch] = useReducer(reducer, initial);
  const dispatchGlobal = useContext(searchContextDispatch);
  const {
    filterCategories,
    filterDevelopmentStatuses,
    filterIntendedAudiences,
    page,
    searchValue,
    sortBy,
  } = useContext(searchContextState);

  const reloadItemsUntilPage = useRef(page > 0 ? page : null);
  const from = reloadItemsUntilPage.current ? 0 : page * pageSize;
  const size = reloadItemsUntilPage.current
    ? (reloadItemsUntilPage.current + 1) * pageSize
    : pageSize;

  const fetchMore = () => {
    if (!isLoading && areMoreItemsAvailable(from, size, total)) {
      dispatchGlobal(incrementPage());
    }
  };

  const results: Store[] = useFlexSearch(searchValue, index, store);

  useEffect(() => {
    let filtered: Store[] = results;
    if (!searchValue) {
      filtered = allSoftware;
    }

    filterCategories[0]
      ? (filtered = filterCategories.map((f) => filtered.filter((k) => k.publiccode.categories.includes(f)))?.at(0) || [])
      : filtered;
    filterIntendedAudiences[0]
      ? (filtered = filterIntendedAudiences.map((f) => filtered.filter((k) => k.publiccode.intendedAudience?.scope?.includes(f)))?.at(0) || [])
      : filtered;
    filterDevelopmentStatuses[0]
      ? (filtered = filterDevelopmentStatuses.map((f) => filtered.filter((k) => k.publiccode.developmentStatus === f))?.at(0) || [])
      : filtered;

    switch (sortBy) {
      case ALPHABETICAL:
        filtered.sort((a, b) => a.publiccode.name.localeCompare(b.publiccode.name));
        break;
      case RELEASE_DATE:
        filtered.sort((a, b) => b.publiccode.releaseDate.localeCompare(a.publiccode.releaseDate));
        break;
      case VITALITY:
        break;
    }

    const set: ActionSetItems = { type: ActionType.SET_ITEMS, value: { items: filtered, total: filtered.length } };
    const add: ActionAddItems = { type: ActionType.ADD_ITEMS, value: { items: filtered } };
    dispatch(from === 0 ? set : add);
  }, [filterCategories, filterDevelopmentStatuses, filterIntendedAudiences, results, searchValue, sortBy]);

  return [errorMessage, items, total, fetchMore] as const;
};
