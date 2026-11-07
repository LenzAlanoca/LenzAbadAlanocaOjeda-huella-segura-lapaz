#  Huella Segura La Paz — Engine de Perímetro EDO

> **Desafío Individual de Métodos Numéricos**
>  **Author:** Lenz Abad Alanoca Ojeda 
> **Área:** Ingeniería de Sistemas / Informática, Desarrollo de Software e Innovación  
> **Fecha de Entrega:** 6 de noviembre de 2026  
> **Ubicación de Aplicación:** La Paz, Bolivia 🇧🇴  

---

##  Descripción del Proyecto

**Huella Segura La Paz** es una aplicación web interactiva diseñada para ayudar a comunidades vecinales, familias y redes de rescate animal en la búsqueda de mascotas extraviadas en zonas de ladera de la ciudad de La Paz (Cotahuma, Villa Fátima, San Antonio, Periférica).

A diferencia de las plataformas estáticas convencionales, este software integra en su frontend un **motor de cálculo numérico de propagación geográfica continua** basado en Ecuaciones Diferenciales Ordinarias (EDO) de primer orden. El algoritmo delimita un perímetro de búsqueda dinámico en tiempo real, considerando la fatiga metabólica del animal en altitud ($>3.600 \text{ msnm}$) y la pendiente topográfica paceña.

---

##  Modelo Matemático

La tasa de expansión del radio de búsqueda $r(t)$ [km] respecto al tiempo $t$ [horas] se define mediante la EDO corregida:

$$\frac{dr}{dt} = f(t, r) = \max\left(0, v_0 \cdot e^{-\alpha t} \cdot \cos(\theta) - k_{\text{caza}}\right)$$

### Parámetros Calibrados para La Paz:
* **$v_0$:** Velocidad inicial de huida ajustada por talla y factor de estrés por pirotecnia ($1.2 \text{ a } 5.5 \text{ km/h}$).
* **$\alpha$:** Coeficiente de fatiga y desaceleración urbana ($0.70 \text{ a } 1.10 \text{ h}^{-1}$).
* **$\theta$:** Inclinación topográfica del terreno ($10^\circ \text{ a } 35^\circ$).
* **$k_{\text{caza}}$:** Resistencia física por manzanas, gradas y tráfico vehicular ($0.30 \text{ km/h}$).
* **Condición Inicial:** $r(0) = 0 \text{ km}$.

---

##  Métodos Numéricos Evaluados

El software resuelve la EDO en tiempo real evaluando tres enfoques:

1. **Solución Analítica Exacta:**
   $$r(t) = \frac{v_0 \cos(\theta)}{\alpha} \left( 1 - e^{-\alpha t} \right) - k_{\text{caza}} \cdot t$$
2. **Método de Heun (Predictor-Corrector de Orden 2):**
   $$r_{i+1} = r_i + \frac{h}{2} \left[ f(t_i, r_i) + f(t_{i+1}, \tilde{r}_{i+1}) \right]$$
3. **Método Runge-Kutta de 4º Orden (RK4 - Orden 4):**
   $$r_{i+1} = r_i + \frac{h}{6} (k_1 + 2k_2 + 2k_3 + k_4)$$

### Conclusión de Precisión:
RK4 demostró una convergencia superior con un error relativo global de solo **$0.026\%$** respecto a la solución analítica (frente al **$3.8\%$** de Heun), garantizando máxima fidelidad cartográfica en la pantalla del usuario.

---

##  Fenómeno del Radio Máximo ($r_{\text{máx}}$)

El modelo demuestra que el radio no crece de forma infinita. A las $\approx 1.5 \text{ horas}$, la velocidad neta de huida se iguala con la resistencia urbana ($\frac{dr}{dt} = 0$), alcanzando una asíntota horizontal ($\approx 1.44 \text{ km}$). Esto indica a los vecinos que la mascota se ha refugiado y la búsqueda debe concentrarse en inspeccionar a detalle el área delimitada.

---

##  Tecnologías Utilizadas

* **HTML5 / CSS3:** Interfaz responsive con arquitectura de panel lateral.
* **JavaScript (Vanilla JS - ES6+):** Motor de cálculo numérico en tiempo real sin dependencias de servidor.
* **Leaflet.js (v1.9.4):** Renderizado de mapas interactivos y capas vectoriales.
* **Esri ArcGIS World Street Map:** Proyección de azulejos (tiles) de alta resolución urbana.

---

##  Instrucciones de Ejecución Local

No requiere instalación de Node.js, compiladores ni servidores locales.

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/TU_USUARIO/huella-segura-lapaz.git](https://github.com/TU_USUARIO/huella-segura-lapaz.git)
   cd huella-segura-lapaz
