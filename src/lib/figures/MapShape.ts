import {
  BasicMaterial,
  Options,
  RegionBaseStyle,
  StoreConfig,
} from "@/lib/interface";
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshBasicMaterial,
  ShapeUtils,
  Vector2,
} from "three";
import { Feature, Position } from "geojson";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { lon2xyz } from "@/lib/utils/math";
import MapStore from "@/lib/store/mapStore";
import ChartScene from "@/lib/chartScene";

export default class MapShape {
  private readonly _config: StoreConfig;
  wallPoints: Record<string, any> = {};
  currentStyle: RegionBaseStyle;
  features: Feature[];
  geometryArr: BufferGeometry[] = [];
  _options: Options;

  constructor(chartScene: ChartScene) {
    this._config = chartScene._store.getConfig();
    this._options = chartScene.options;

    this.features = MapStore.hashMap[chartScene.options.map];
  }
  create() {
    const arr: Group[] = [];
    // const features = store.hashMap
    this.features.forEach((item: Feature) => {
      this.getCurrentStyle(item.properties?.name);
      if (this.currentStyle.show === false) return;
      this.geometryArr = [];
      const countryGroup = new Group();
      countryGroup.name = `countryGroup-${item.properties?.name}`;
      // //如果一个国家是单个轮廓
      let countryCoordinates: Position[][][] = [];
      if (item.geometry.type === "Polygon") {
        countryCoordinates.push(item.geometry.coordinates);
      } else if (item.geometry.type === "MultiPolygon") {
        countryCoordinates = item.geometry.coordinates;
      }
      if (this._options.mode === "2d") {
        const { lineArr } = this.create2d(countryCoordinates);
        countryGroup.add(...lineArr);
      } else {
        const { lineArr } = this.create3d(countryCoordinates);
        countryGroup.add(...lineArr);
      }
      const mesh = this.mergeGeometry();
      countryGroup.add(mesh);
      mesh.name = item.properties?.name;
      mesh.userData = {
        ...item.properties,
        type: "country",
        backupColor: this.currentStyle.areaColor,
        opacity: this.currentStyle.opacity,
      };
      arr.push(countryGroup);
    });
    return arr;
  }
  create2d(countryCoordinates: Position[][][]) {
    const lineArr: LineLoop[] = [];
    countryCoordinates.forEach((subItem: Position[][]) => {
      if (!subItem[0]) return;
      const { linePoints2d, allPoints2d, usefulIndexArr } = this.gridPoint(
        subItem[0]
      );
      const shapeGeometry = this.createShapeGeometry(
        usefulIndexArr,
        allPoints2d
      );
      this.geometryArr.push(shapeGeometry);
      const lineMesh = this.createLineMesh(linePoints2d);
      lineArr.push(lineMesh);
    });
    return {
      lineArr,
    };
  }
  create3d(countryCoordinates: Position[][][]) {
    const lineArr: LineLoop[] = [];
    countryCoordinates.forEach((subItem: Position[][]) => {
      if (!subItem[0]) return;
      const { linePoints3d, allPoints3d, usefulIndexArr } = this.gridPoint(
        subItem[0]
      );
      const shapeGeometry = this.createShapeGeometry(
        usefulIndexArr,
        allPoints3d
      );
      this.geometryArr.push(shapeGeometry);
      const lineMesh = this.createLineMesh(linePoints3d);
      lineArr.push(lineMesh);
    });
    return {
      lineArr,
    };
  }
  createShapeGeometry(usefulIndexArr: number[], points: number[]) {
    const geometry = new BufferGeometry(); //创建一个几何体
    // 设置几何体顶点索引
    geometry.index = new BufferAttribute(new Uint16Array(usefulIndexArr), 1);
    // 设置几何体顶点位置坐标
    geometry.attributes.position = new BufferAttribute(
      new Float32Array(points),
      3
    );

    return geometry;
  }
  createLineMesh(points: number[]) {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(points), 3)
    );
    const lineMaterial = new LineBasicMaterial({
      color: this._config.mapStyle.lineColor,
    });
    return new LineLoop(geometry, lineMaterial);
  }
  mergeGeometry() {
    let aggGeometry: BufferGeometry | undefined = undefined;
    //多轮廓
    if (this.geometryArr.length > 1) {
      aggGeometry = mergeGeometries(this.geometryArr);
    } else {
      aggGeometry = this.geometryArr[0];
    }
    aggGeometry.computeVertexNormals(); //如果使用受光照影响材质，需要计算生成法线
    const material = this.createMaterial();
    return new Mesh(aggGeometry, material);
  }
  createMaterial() {
    const materialType: BasicMaterial =
      this.currentStyle.material ||
      this._config.mapStyle.material ||
      "MeshBasicMaterial";
    const transparent =
      typeof this.currentStyle.opacity === "number" &&
      this.currentStyle.opacity < 1;
    const baseConfig = {
      color: this.currentStyle.areaColor,
      side: BackSide,
      opacity: this.currentStyle.opacity,
      transparent,
    };
    if (materialType === "MeshLambertMaterial") {
      return new MeshLambertMaterial(baseConfig);
    }
    if (materialType === "MeshPhongMaterial") {
      return new MeshPhongMaterial(baseConfig);
    }
    return new MeshBasicMaterial(baseConfig);
  }
  gridPoint(polygon: Position[]) {
    //边界线的点位合集 和平面图形的点位合集
    const allPoints3d: number[] = [],
      linePoints3d: number[] = [],
      allPoints2d: number[] = [],
      linePoints2d: number[] = [];
    const lonArr: number[] = []; //polygon的所有经度坐标
    const latArr: number[] = []; //polygon的所有纬度坐标
    polygon.forEach((item: Position) => {
      lonArr.push(item[0]);
      latArr.push(item[1]);
      const coord_line = lon2xyz(this._config.R + 0.1, item[0], item[1]);
      const coord_point3d = lon2xyz(this._config.R, item[0], item[1]);
      linePoints3d.push(coord_line.x, coord_line.y, coord_line.z);
      linePoints2d.push(...item, 0);
      allPoints3d.push(coord_point3d.x, coord_point3d.y, coord_point3d.z);
      allPoints2d.push(...item, 0);
    });
    // minMax()计算polygon所有经纬度返回的极大值、极小值
    const [lonMin, lonMax] = this.minMax(lonArr);
    const [latMin, latMax] = this.minMax(latArr);
    // 经纬度极小值和极大值构成一个矩形范围，可以包裹多边形polygon，在矩形范围内生成等间距顶点
    //  设置均匀填充点的间距
    const span: number = 2;
    const row: number = Math.ceil((lonMax - lonMin) / span);
    const col: number = Math.ceil((latMax - latMin) / span);
    const rectPointsArr = []; //polygon对应的矩形轮廓内生成均匀间隔的矩形网格数据rectPointsArr
    for (let i = 0; i < row + 1; i++) {
      for (let j = 0; j < col + 1; j++) {
        //两层for循环在矩形范围内批量生成等间距的网格顶点数据
        rectPointsArr.push([lonMin + i * span, latMin + j * span]);
      }
    }
    //除去边界线外的矩阵点位 只保留边界线内的矩阵点位（不包含边界线）
    const polygonPointsArr: Position[] = [];
    rectPointsArr.forEach((coord: number[]) => {
      //coord:点经纬度坐标
      if (this.pointInPolygon(coord, polygon)) {
        //判断点coord是否位于多边形中 位于多边形之中的点放在一起
        polygonPointsArr.push(coord);
        //把符合条件的点位 放到集合里
        const point3D = lon2xyz(this._config.R as number, coord[0], coord[1]);
        const { x, y, z } = point3D;
        allPoints3d.push(x, y, z);
        allPoints2d.push(coord[0], coord[1], 0);
      }
    });
    //渲染国家边界线
    const geographyPoints = [...polygon, ...polygonPointsArr];
    const usefulIndexArr = this.trianglePlan(geographyPoints, polygon);
    return {
      linePoints3d,
      allPoints3d,
      linePoints2d,
      usefulIndexArr,
      allPoints2d,
    };
  }
  minMax(arr: number[]) {
    // 数组元素排序
    arr.sort(this.compareNum);
    // 通过向两侧取整，把经纬度的方位稍微扩大
    return [Math.floor(arr[0]), Math.ceil(arr[arr.length - 1])];
  }
  // 数组排序规则
  compareNum(num1: number, num2: number) {
    if (num1 < num2) {
      return -1;
    } else if (num1 > num2) {
      return 1;
    } else {
      return 0;
    }
  }
  pointInPolygon(point: number[], polygon: Position[]) {
    const x = point[0],
      y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];
      const intersect =
        yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  trianglePlan(polygonPointsArr: Position[], polygon: Position[]) {
    const usefulIndexArr: number[] = [];
    const boundaryCount = polygon.length;

    if (boundaryCount < 3) {
      return usefulIndexArr;
    }

    const boundaryPoints = polygon.slice(0, boundaryCount - 1);
    const boundaryVectors = boundaryPoints.map(
      (point) => new Vector2(point[0], point[1])
    );

    if (boundaryVectors.length < 3) {
      return usefulIndexArr;
    }

    const triangleIndices = ShapeUtils.triangulateShape(boundaryVectors, []);
    triangleIndices.forEach(([a, b, c]) => {
      usefulIndexArr.push(a, b, c);
    });

    if (polygonPointsArr.length > boundaryCount) {
      const centerIndex = polygonPointsArr.length - 1;
      for (let index = 0; index < boundaryCount - 1; index += 1) {
        const nextIndex = (index + 1) % (boundaryCount - 1);
        usefulIndexArr.push(index, nextIndex, centerIndex);
      }
    }

    return usefulIndexArr;
  }
  getCurrentStyle(name: string) {
    this.currentStyle = { ...this._config.mapStyle };
    if (this._config.regions?.[name]) {
      Object.assign(this.currentStyle, this._config.regions[name]);
    }
  }
}
