/** Locally generated vector art: a projected wireframe torus, no network assets. */
export function orbitalArt(): string {
  const point = (u: number, v: number): [number, number, number] => {
    const radius = 178 + 70 * Math.cos(v);
    const x = radius * Math.cos(u);
    const y = radius * Math.sin(u);
    const z = 70 * Math.sin(v);
    const tilt = 0.92;
    const yy = y * Math.cos(tilt) - z * Math.sin(tilt);
    const zz = y * Math.sin(tilt) + z * Math.cos(tilt);
    const rotation = -0.54;
    return [300 + x * Math.cos(rotation) - yy * Math.sin(rotation), 290 + x * Math.sin(rotation) + yy * Math.cos(rotation), zz];
  };
  const paths: { d: string; z: number }[] = [];
  for (let i = 0; i < 60; i++) {
    const u = i / 60 * Math.PI * 2;
    const points = Array.from({ length: 65 }, (_, j) => point(u, j / 64 * Math.PI * 2));
    paths.push({ d: points.map(([x, y], j) => `${j ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z', z: points.reduce((s, p) => s + p[2], 0) / points.length });
  }
  for (let i = 0; i < 26; i++) {
    const points = Array.from({ length: 161 }, (_, j) => point(j / 160 * Math.PI * 2, i / 26 * Math.PI * 2));
    paths.push({ d: points.map(([x, y], j) => `${j ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z', z: -30 });
  }
  return `<svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g class="art-guides" stroke="currentColor" opacity=".17"><circle cx="300" cy="290" r="278" stroke-dasharray="2 8"/><path d="M5 290h30m530 0h30M300 0v25m0 530v25M290 290h20m-10-10v20"/></g><g stroke="currentColor" stroke-width=".85">${paths.sort((a, b) => a.z - b.z).map(p => `<path d="${p.d}" opacity="${((p.z + 260) / 550).toFixed(2)}"/>`).join('')}</g><g fill="currentColor" font-family="monospace" font-size="10" letter-spacing="2" opacity=".65"><text x="22" y="530">FIG. 01</text><text x="439" y="70">IDEAS IN ORBIT</text><text x="436" y="552">FRAME / STUDIO</text></g></svg>`;
}
