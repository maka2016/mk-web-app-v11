import axios from 'axios';
import { useEffect, useState } from 'react';
import qs from 'qs';

export const promptToken = `f042966d53f71413bc5143412fb3e5c45bdc1dc55a6c5d7c6f95a9defdfce37836b7413647b3f334fae050f8ed22665e224dc121d884bc96a89791d5b3ab5cea3bd0e77ff95e05281cda9f581f1bee0d99db896ffe7dfd300c04e6a1e79b6dac326581d02f0df7bfb6309b3ff9aaf9e24bd80a3c0b63f3bdfd7b2fbe53bf9d70`;

const getCmsApiHost = () => {
  return typeof window !== 'undefined' && /dev_cms/.test(window.location.href)
    ? 'http://localhost:1337'
    : 'https://prompt.maka.im';
};

export const requestCMS = axios.create({
  baseURL: `${getCmsApiHost()}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${promptToken}`,
  },
});

interface Floor {
  documentId: string;
  name: string;
}

interface MaterialItem {
  documentId: string;
  name: string;
  content: any;
  cover: {
    url: string;
  };
}

// 素材列表
const getMaterials = async (options: {
  materialClass: string;
  activeFloorId?: string;
  limit: number;
  page?: number;
}) => {
  const { materialClass, activeFloorId, limit, page = 1 } = options;
  const query = qs.stringify(
    {
      populate: {
        cover: {
          populate: '*',
        },
      },

      filters: {
        material_class: {
          name: {
            $eq: materialClass,
          },
        },
        ...(activeFloorId
          ? {
              material_tags: {
                documentId: {
                  $eq: activeFloorId,
                },
              },
            }
          : {}),
      },
      pagination: {
        pageSize: limit,
        page,
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMS.get(
    `/material-items?${query}&populate=material_class`
  );
  return res.data;
};

// 素材列表
const getMaterialFloors = async (options: {
  materialClass: string;
  limit: number;
  page?: number;
}) => {
  const { materialClass, limit, page = 1 } = options;
  const query = qs.stringify(
    {
      populate: '*',

      filters: {
        material_class: {
          name: {
            $eq: materialClass,
          },
        },
      },
      pagination: {
        pageSize: limit,
        page,
      },
    },
    { encodeValuesOnly: true }
  );

  const res = await requestCMS.get(`/material-tags?${query}`);
  return res.data;
};

export const useMaterialItems = (options: {
  materialClass: string;
  limit?: number;
}) => {
  const { materialClass, limit = 60 } = options;
  const [materialList, setMaterialList] = useState<MaterialItem[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [activeMaterialId, setActiveMaterialId] = useState<string>();
  const [activeFloorId, setActiveFloorId] = useState<string>();
  const [page, setPage] = useState(1);

  const loadItems = () => {
    setLoading(true);
    getMaterials({ materialClass, activeFloorId, limit, page }).then(res => {
      if (res?.data) {
        setMaterialList(page === 1 ? res.data : materialList.concat(res.data));
        setFinished(res.meta.pagination.total < page * limit);
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    getMaterialFloors({ materialClass, limit, page }).then(res => {
      if (res?.data) {
        setFloors([{ documentId: undefined, name: '全部' }, ...res.data]);
      }
    });
  }, []);

  useEffect(() => {
    loadItems();
  }, [page]);

  useEffect(() => {
    setFinished(false);
    setPage(1);
    loadItems();
  }, [activeFloorId]);

  return {
    materialList,
    floors,
    loading,
    finished,
    activeMaterialId,
    activeFloorId,
    page,
    setActiveMaterialId,
    setActiveFloorId,
    setPage,
  };
};
