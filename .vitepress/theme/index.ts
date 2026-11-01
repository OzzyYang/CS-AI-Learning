import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import Layout from './Layout.vue'
import HomePage from './components/HomePage.vue'
import CatalogGrid from './components/CatalogGrid.vue'
import YearOverview from './components/YearOverview.vue'

import BinaryConverter from './components/labs/BinaryConverter.vue'
import SortingVisualizer from './components/labs/SortingVisualizer.vue'
import CpuSimulator from './components/labs/CpuSimulator.vue'
import TcpHandshake from './components/labs/TcpHandshake.vue'
import DataStructureViz from './components/labs/DataStructureViz.vue'

import 'katex/dist/katex.min.css'
import './styles/base.css'
import './styles/content.css'
import './styles/lab.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('CatalogGrid', CatalogGrid)
    app.component('YearOverview', YearOverview)

    app.component('BinaryConverter', BinaryConverter)
    app.component('SortingVisualizer', SortingVisualizer)
    app.component('CpuSimulator', CpuSimulator)
    app.component('TcpHandshake', TcpHandshake)
    app.component('DataStructureViz', DataStructureViz)
  }
} satisfies Theme
