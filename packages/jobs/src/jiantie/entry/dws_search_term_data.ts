// 搜索词统计表（日dws）
// 按日统计搜索、点击、创作等数据指标

//数据说明
//搜索PV/UV：从biAdb的mk_datawork_sls_events读取，appid IN ('jiantie', 'maka'), event_type='page_view', page_type='search_v2_page'｜'search_page_mix', searchword就是搜索词
//搜索结果数量(result_count)：从biAdb的mk_datawork_sls_events读取搜索事件的object_id字段（存储的是搜索结果数量），计算同一搜索词的平均值
//点击PV/UV：从biAdb的mk_datawork_sls_events读取，appid IN ('jiantie', 'maka'), event_type='page_view', page_type='template_page', ref_page_type='search_v2_page', searchword就是搜索词
//创作PV/UV：从works_entity读取，metadata中的ref_page_type='search_v2_page', searchword就是搜索词

//注意：部分模板id可能不存在于tempalte_entity表，因为新模板和老模板是分开的
