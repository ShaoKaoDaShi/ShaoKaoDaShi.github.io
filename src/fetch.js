import fs from "fs/promises"
fetch("https://zhongkui.bytedance.net/api/v1/mrs/7591269/cards_feed", {
  "headers": {
    "accept": "application/json",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwYWFzLnBhc3Nwb3J0LmF1dGgiLCJleHAiOjE3NjEwMzAxMDksImlhdCI6MTc2MTAyNjQ0OSwidXNlcm5hbWUiOiJwZWlzaHVhbmdoZW5nIiwidHlwZSI6InBlcnNvbl9hY2NvdW50IiwicmVnaW9uIjoiY24iLCJ0cnVzdGVkIjp0cnVlLCJ1dWlkIjoiMDZhOTIwYzAtOTNmZC00OTFmLTg1MmEtZGQyYjFiYWY0MmM1Iiwic2l0ZSI6ImxvY2FsIiwiYnl0ZWNsb3VkX3RlbmFudF9pZCI6ImJ5dGVkYW5jZSIsImJ5dGVjbG91ZF90ZW5hbnRfaWRfb3JnIjoiYnl0ZWRhbmNlIiwic2NvcGUiOiJieXRlZGFuY2UiLCJzZXF1ZW5jZSI6IlJEIiwib3JnYW5pemF0aW9uIjoi5oqW6Z-z56CU5Y-RLeWuouaIt-err-WfuuehgOaKgOacry3lt6XnqIvmlYjog70tRGV2T3BzIiwid29ya19jb3VudHJ5IjoiQ0hOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vczEtaW1maWxlLmZlaXNodWNkbi5jb20vc3RhdGljLXJlc291cmNlL3YxL3YzXzAwYjJfMDVlZTE2NTQtZmIzYS00Y2UwLThmYWMtZDNmMjAxZmQ5ZGJnfj9pbWFnZV9zaXplPW5vb3BcdTAwMjZjdXRfdHlwZT1cdTAwMjZxdWFsaXR5PVx1MDAyNmZvcm1hdD1wbmdcdTAwMjZzdGlja2VyX2Zvcm1hdD0ud2VicCIsImVtYWlsIjoicGVpc2h1YW5naGVuZ0BieXRlZGFuY2UuY29tIiwiZW1wbG95ZWVfaWQiOjEzOTY1MzMsIm5ld19lbXBsb3llZV9pZCI6MTM5NjUzM30.rRodCW5P23c6EHYh1DyUHgczkhGOjekT5hstBjHc5hiFy-esbsCIjT9dq0U6RZiBZ125xbWpFSguWJkYGLAh41KY0b3WWwsCrfVv663Si5DRn9v4WJHeN0W0jpfbIi2iBdtModUa_uzq6UWF7_xnvHXT3SSBUmAKZwlTI_em20Q",
    "content-type": "application/json",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "x-bits-auth-appid": "112801",
    "x-client-locale": "zh",
    "x-jwt-token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwYWFzLnBhc3Nwb3J0LmF1dGgiLCJleHAiOjE3NjEwMzAxMDksImlhdCI6MTc2MTAyNjQ0OSwidXNlcm5hbWUiOiJwZWlzaHVhbmdoZW5nIiwidHlwZSI6InBlcnNvbl9hY2NvdW50IiwicmVnaW9uIjoiY24iLCJ0cnVzdGVkIjp0cnVlLCJ1dWlkIjoiMDZhOTIwYzAtOTNmZC00OTFmLTg1MmEtZGQyYjFiYWY0MmM1Iiwic2l0ZSI6ImxvY2FsIiwiYnl0ZWNsb3VkX3RlbmFudF9pZCI6ImJ5dGVkYW5jZSIsImJ5dGVjbG91ZF90ZW5hbnRfaWRfb3JnIjoiYnl0ZWRhbmNlIiwic2NvcGUiOiJieXRlZGFuY2UiLCJzZXF1ZW5jZSI6IlJEIiwib3JnYW5pemF0aW9uIjoi5oqW6Z-z56CU5Y-RLeWuouaIt-err-WfuuehgOaKgOacry3lt6XnqIvmlYjog70tRGV2T3BzIiwid29ya19jb3VudHJ5IjoiQ0hOIiwiYXZhdGFyX3VybCI6Imh0dHBzOi8vczEtaW1maWxlLmZlaXNodWNkbi5jb20vc3RhdGljLXJlc291cmNlL3YxL3YzXzAwYjJfMDVlZTE2NTQtZmIzYS00Y2UwLThmYWMtZDNmMjAxZmQ5ZGJnfj9pbWFnZV9zaXplPW5vb3BcdTAwMjZjdXRfdHlwZT1cdTAwMjZxdWFsaXR5PVx1MDAyNmZvcm1hdD1wbmdcdTAwMjZzdGlja2VyX2Zvcm1hdD0ud2VicCIsImVtYWlsIjoicGVpc2h1YW5naGVuZ0BieXRlZGFuY2UuY29tIiwiZW1wbG95ZWVfaWQiOjEzOTY1MzMsIm5ld19lbXBsb3llZV9pZCI6MTM5NjUzM30.rRodCW5P23c6EHYh1DyUHgczkhGOjekT5hstBjHc5hiFy-esbsCIjT9dq0U6RZiBZ125xbWpFSguWJkYGLAh41KY0b3WWwsCrfVv663Si5DRn9v4WJHeN0W0jpfbIi2iBdtModUa_uzq6UWF7_xnvHXT3SSBUmAKZwlTI_em20Q",
    "x-onesite": "1",
    "x-tt-env": "ppe_feat_mr_report",
    "x-use-ppe": "1",
    "Referer": "http://localhost:3099/"
  },
  "body": "{\"mode\":\"develop\",\"tab\":\"all\"}",
  "method": "POST"
}).then(res => res.json()).then(json => fs.writeFile("./data.json", JSON.stringify(json, null, 2)));
