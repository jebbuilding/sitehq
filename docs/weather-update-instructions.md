# Instructions for the "JEB weather update" scheduled task

The weather-wise planner needs the 10-day forecast. Replace the whole of the task's instructions with the text between the lines below (it is the old text plus step 4b and "days" in step 5). Scheduled tasks made from the Claude app can reach the SiteHQ database; ones made any other way cannot, which is why this is done by hand.

---

Update the live weather shown in James Bray's "JEB Timesheets" app (a Claude artifact at https://claude.ai/artifact/FjLkyzz3jsxrGeowjY2fmh). Work quickly and quietly; there is no one to talk to. Do not change anything else in the app.

Tools: use the ArtifactData tool (load it with ToolSearch "select:ArtifactData") for the app's database, and the AccuWeather connector tools (load with ToolSearch "+AccuWeather"): mcp__AccuWeather__widgets-search-claude, mcp__AccuWeather__widgets-current-claude and mcp__AccuWeather__widgets-daily-claude.

Steps:
1. ArtifactData get, collection "settings", doc_id "weather" (note its version; it may not exist yet). It has a "places" array; each place may already carry an AccuWeather "key" for a site, reuse those keys instead of searching again.
2. ArtifactData list, collection "sites" (limit 200). Each document has a "name" (an address or village, e.g. "Kennford" or "12 Marine Way, Exmouth EX8 1AA") and maybe "lat"/"lon".
3. Build the list of places: always Exmouth, Devon (key 322498, site ""), plus one per site. For a site with no key yet, search AccuWeather with the site name; if nothing is found, try just the postcode, then just the town/village part (the last part after a comma, without the postcode). Only accept a UK result (in Devon or nearby). If still nothing, skip that site. Sites that resolve to the same key can share one weather call.
4. For each distinct key call widgets-current-claude with queryParams {locationKey, unit:"metric", lang:"en"}. From the result take: currentConditions.iconCode (icon), currentConditions.phrase (phrase), currentConditions.temperatureValue (temp, °C), currentConditions.windSpeedImperial (wind, mph), and location.info.latitude / longitude (lat, lon), location.info.name (name).
4b. Also for each distinct key call widgets-daily-claude with queryParams {locationKey, unit:"metric", lang:"en"} (the forecast, for the weather-wise planner). From the first 10 entries of dailyForecast make, for each, {"d": the YYYY-MM-DD part of its "date", "rain": day.rainProbabilityValue, "mm": day.extended.rainValue + night.extended.rainValue rounded to 1 decimal place, "max": day.temperature, "min": night.temperature, "gust": the number of km/h in day.extended.gusts, "phrase": day.iconPhrase}. If the forecast call fails for a key, leave "days" out for that place; it is not a reason to stop.
5. Write ArtifactData set, collection "settings", doc_id "weather" (pass if_version from step 1 if the doc existed), with data exactly in this shape:
{"at": <current time in epoch milliseconds>, "source": "AccuWeather", "places": [{"name": "Exmouth, Devon", "site": "", "key": "322498", "lat": .., "lon": .., "icon": <int>, "phrase": "..", "temp": <number>, "wind": <number>, "days": [{"d": "YYYY-MM-DD", "rain": <%>, "mm": <number>, "max": <°C>, "min": <°C>, "gust": <km/h>, "phrase": ".."}, ...]}, {"name": "<AccuWeather name>", "site": "<the site's name exactly as in the sites collection>", "key": "..", "lat": .., "lon": .., "icon": .., "phrase": "..", "temp": .., "wind": .., "days": [..]}, ...]}
Get the current epoch milliseconds by running `date +%s%3N` in the shell. If the write fails because the version changed, get the doc again and retry once.
6. If AccuWeather is not reachable or every call fails, do not write anything. Finish with a one-line summary.

---
