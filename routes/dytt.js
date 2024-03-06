const Router = require("koa-router");
const dyttRouter = new Router();
const axios = require("axios");
const cheerio = require("cheerio");
const { get, set, del } = require("../utils/cacheData");

// 接口信息
const routerInfo = {
  name: "dytt",
  title: "电影天堂",
  subtitle: "最新电影",
};

// 缓存键名
const cacheKey = "dyttData";

// 调用时间
let updateTime = new Date().toISOString();

// 调用路径
const url = "https://www.dydytt.net/index.htm";
const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
  };
// 数据处理
const getData = (data) => {
    if (!data) return false;
    const dataList = [];
    const $ = cheerio.load(data);
    try {
        $(".co_content8:first tr").map((idx, item) => {
            const nameLink  = $(item).find("a").eq(1);
            const date = $(item).find('font').text();
            const name = nameLink.text();
            const url = nameLink.attr('href');
      
            dataList.push({
              title: name,
              url: url,
              date:date,
            });
          });
      return dataList;
    } catch (error) {
      console.error("数据处理出错" + error);
      return false;
    }
  };

// 电影天堂最新电影
dyttRouter.get("/dytt", async (ctx) => {
  console.log("获取电影天堂最新电影");
  try {
    // 从缓存中获取数据
    let data = await get(cacheKey);
    const from = data ? "cache" : "server";
    if (!data) {
      // 如果缓存中不存在数据
      console.log("从服务端重新获取电影天堂最新电影");
      // 从服务器拉取数据
      const response = await axios.get(url, { headers });
      console.log(response);
      console.log(response.data);
      data = getData(response.data);
      updateTime = new Date().toISOString();
      // 将数据写入缓存
      await set(cacheKey, data);
    }
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      total: data.length,
      updateTime,
      data,
    };
  } catch (error) {
    console.error(error);
    ctx.body = {
      code: 500,
      ...routerInfo,
      message: "获取失败",
    };
  }
});

// 电影天堂最新电影 - 获取最新数据
dyttRouter.get("/dytt/new", async (ctx) => {
  console.log("获取电影天堂最新电影 - 最新数据");
  try {
    // 从服务器拉取最新数据
    const response = await axios.get(url, { headers });
    const newData = getData(response.data);
    updateTime = new Date().toISOString();
    console.log("从服务端重新获取电影天堂最新电影");

    // 返回最新数据
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      total: newData.length,
      updateTime,
      data: newData,
    };

    // 删除旧数据
    await del(cacheKey);
    // 将最新数据写入缓存
    await set(cacheKey, newData);
  } catch (error) {
    // 如果拉取最新数据失败，尝试从缓存中获取数据
    console.error(error);
    const cachedData = await get(cacheKey);
    if (cachedData) {
      ctx.body = {
        code: 200,
        message: "获取成功",
        ...routerInfo,
        total: cachedData.length,
        updateTime,
        data: cachedData,
      };
    } else {
      // 如果缓存中也没有数据，则返回错误信息
      ctx.body = {
        code: 500,
        ...routerInfo,
        message: "获取失败",
      };
    }
  }
});

dyttRouter.info = routerInfo;
module.exports = dyttRouter;
