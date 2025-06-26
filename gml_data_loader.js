console.log('GMLDataLoader loaded');
// 最小構成のGMLデータローダー（建物のみ対応・デバッグログ付き）
class GMLDataLoader {
    constructor() {
        this.buildings = [];
        this.roads = [];
    }
    async loadGMLFile(filePath) {
        try {
            const response = await fetch(filePath);
            const gmlText = await response.text();
            return this.parseGML(gmlText);
        } catch (error) {
            console.error('GMLファイルの読み込みに失敗:', error);
            return null;
        }
    }
    parseGML(gmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gmlText, "text/xml");
        this.parseBuildings(xmlDoc);
        this.parseRoads(xmlDoc);
        return { buildings: this.buildings, roads: this.roads };
    }
    parseBuildings(xmlDoc) {
        const NS = "http://fgd.gsi.go.jp/spec/2008/FGD_GMLSchema";
        const GMLNS = "http://www.opengis.net/gml/3.2";
        const buildingElements = xmlDoc.getElementsByTagNameNS(NS, 'BldA');
        console.log('BldA数:', buildingElements.length);
        Array.from(buildingElements).forEach((building, idx) => {
            try {
                const area = building.getElementsByTagNameNS(NS, 'area')[0];
                if (!area) { console.log(`[${idx}] areaタグが見つかりません`); return; }
                const surface = area.getElementsByTagNameNS(GMLNS, 'Surface')[0];
                if (!surface) { console.log(`[${idx}] Surfaceタグが見つかりません`); return; }
                const patches = surface.getElementsByTagNameNS(GMLNS, 'patches')[0];
                if (!patches) { console.log(`[${idx}] patchesタグが見つかりません`); return; }
                const polygonPatch = patches.getElementsByTagNameNS(GMLNS, 'PolygonPatch')[0];
                if (!polygonPatch) { console.log(`[${idx}] PolygonPatchタグが見つかりません`); return; }
                const exterior = polygonPatch.getElementsByTagNameNS(GMLNS, 'exterior')[0];
                if (!exterior) { console.log(`[${idx}] exteriorタグが見つかりません`); return; }
                const ring = exterior.getElementsByTagNameNS(GMLNS, 'Ring')[0];
                if (!ring) { console.log(`[${idx}] Ringタグが見つかりません`); return; }
                const curveMember = ring.getElementsByTagNameNS(GMLNS, 'curveMember')[0];
                if (!curveMember) { console.log(`[${idx}] curveMemberタグが見つかりません`); return; }
                const curve = curveMember.getElementsByTagNameNS(GMLNS, 'Curve')[0];
                if (!curve) { console.log(`[${idx}] Curveタグが見つかりません`); return; }
                const segments = curve.getElementsByTagNameNS(GMLNS, 'segments')[0];
                if (!segments) { console.log(`[${idx}] segmentsタグが見つかりません`); return; }
                const lineStringSegment = segments.getElementsByTagNameNS(GMLNS, 'LineStringSegment')[0];
                if (!lineStringSegment) { console.log(`[${idx}] LineStringSegmentタグが見つかりません`); return; }
                const posList = lineStringSegment.getElementsByTagNameNS(GMLNS, 'posList')[0];
                if (!posList) { console.log(`[${idx}] posListタグが見つかりません`); return; }
                const coordinates = this.parseCoordinates(posList.textContent);
                if (coordinates.length > 2) {
                    this.buildings.push({
                        type: 'building',
                        coordinates: coordinates,
                        height: 10
                    });
                }
            } catch (e) {
                console.log(`[${idx}] 例外:`, e);
            }
        });
    }
    parseRoads(xmlDoc) {
        const NS = "http://fgd.gsi.go.jp/spec/2008/FGD_GMLSchema";
        const GMLNS = "http://www.opengis.net/gml/3.2";
        const roadElements = xmlDoc.getElementsByTagNameNS(NS, 'RdEdg');
        this.roads = [];
        Array.from(roadElements).forEach((road, idx) => {
            try {
                const loc = road.getElementsByTagNameNS(NS, 'loc')[0];
                if (!loc) return;
                const curve = loc.getElementsByTagNameNS(GMLNS, 'Curve')[0];
                if (!curve) return;
                const segments = curve.getElementsByTagNameNS(GMLNS, 'segments')[0];
                if (!segments) return;
                const lineStringSegment = segments.getElementsByTagNameNS(GMLNS, 'LineStringSegment')[0];
                if (!lineStringSegment) return;
                const posList = lineStringSegment.getElementsByTagNameNS(GMLNS, 'posList')[0];
                if (!posList) return;
                const coords = this.parseCoordinates(posList.textContent);
                if (coords.length > 1) {
                    this.roads.push({ coordinates: coords });
                }
            } catch (e) {}
        });
        console.log('parseRoads: roads件数 =', this.roads.length);
    }
    parseCoordinates(posListText) {
        const coords = posListText.trim().split(/\s+/).filter(s => s.length > 0);
        const coordinates = [];
        for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 < coords.length) {
                const lat = parseFloat(coords[i]);
                const lng = parseFloat(coords[i + 1]);
                const x = (lng - 128.774) * 100000;
                const z = (lat - 32.578) * 100000;
                const y = 0;
                coordinates.push({ x, y, z });
            }
        }
        return coordinates;
    }
}
window.GMLDataLoader = GMLDataLoader;