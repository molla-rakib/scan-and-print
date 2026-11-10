// The মুদ্রণ printing press (public/images/logo-small.svg), split into parts so it can run: the gears and
// rollers turn, a printed sheet feeds out, the status lights blink. Pure CSS animations (globals.css,
// "press-*"), switched off for prefers-reduced-motion. Decorative only.

/** Rotates its children around a point given in the SVG's 900×704 coordinates. */
function Spin({ cx, cy, className, children }: { cx: number; cy: number; className: string; children: React.ReactNode }) {
  return (
    <g className={className} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {children}
    </g>
  )
}

export function PrintingPress({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 704" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        {/* The sheet is only visible below the bottom roller's top edge, so it seems to come out of the press. */}
        <clipPath id="press-sheet-clip">
          <rect x="300" y="362" width="600" height="300" />
        </clipPath>
      </defs>

      {/* Status dots and the motion line above the press */}
      <path d="M203.602 34.7503C211.829 34.7503 218.498 28.0825 218.498 19.8573C218.498 11.6322 211.829 4.96436 203.602 4.96436C195.376 4.96436 188.707 11.6322 188.707 19.8573C188.707 28.0825 195.376 34.7503 203.602 34.7503Z" fill="#6B6E75"/>
      <path d="M265.669 39.7145C276.638 39.7145 285.53 30.8241 285.53 19.8573C285.53 8.8904 276.638 0 265.669 0C254.7 0 245.809 8.8904 245.809 19.8573C245.809 30.8241 254.7 39.7145 265.669 39.7145Z" fill="#0B0B0C"/>
      <g className="press-dash">
      <path d="M364.973 7.44678H628.125C715.015 7.44678 770.873 63.2953 787.009 150.171" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" stroke="#6B6E75"/>
      <path d="M364.973 40.9556H476.688" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" stroke="#6B6E75"/>
      </g>
      <path d="M511.444 48.4022C515.557 48.4022 518.892 45.0683 518.892 40.9558C518.892 36.8432 515.557 33.5093 511.444 33.5093C507.331 33.5093 503.996 36.8432 503.996 40.9558C503.996 45.0683 507.331 48.4022 511.444 48.4022Z" fill="#6B6E75"/>
      <path d="M544.959 48.4022C549.073 48.4022 552.407 45.0683 552.407 40.9558C552.407 36.8432 549.073 33.5093 544.959 33.5093C540.846 33.5093 537.512 36.8432 537.512 40.9558C537.512 45.0683 540.846 48.4022 544.959 48.4022Z" fill="#6B6E75"/>
      <path d="M804.385 228.358C814.668 228.358 823.004 220.024 823.004 209.742C823.004 199.461 814.668 191.126 804.385 191.126C794.102 191.126 785.766 199.461 785.766 209.742C785.766 220.024 794.102 228.358 804.385 228.358Z" fill="#6B6E75"/>
      <path d="M60.8591 312.752C67.0289 312.752 72.0306 307.751 72.0306 301.582C72.0306 295.413 67.0289 290.413 60.8591 290.413C54.6892 290.413 49.6875 295.413 49.6875 301.582C49.6875 307.751 54.6892 312.752 60.8591 312.752Z" fill="#6B6E75"/>
      <path d="M47.2013 369.841C57.4844 369.841 65.8206 361.507 65.8206 351.225C65.8206 340.944 57.4844 332.609 47.2013 332.609C36.9182 332.609 28.582 340.944 28.582 351.225C28.582 361.507 36.9182 369.841 47.2013 369.841Z" fill="#6B6E75"/>

      {/* Frame and top roller */}
      <path d="M237.12 137.76L69.5469 485.262L168.85 547.316L342.63 522.494V187.403L237.12 137.76Z" fill="#2A2C31" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M237.12 150.17L106.785 423.208C168.849 373.565 230.914 348.743 317.804 336.332L324.01 199.814L237.12 150.17Z" fill="#3D4047"/>
      <path d="M643.021 81.9116H103.062C55.0738 81.9116 16.1719 120.807 16.1719 168.787C16.1719 216.767 55.0738 255.663 103.062 255.663H643.021C691.009 255.663 729.911 216.767 729.911 168.787C729.911 120.807 691.009 81.9116 643.021 81.9116Z" fill="#1A1B1F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M47.2031 137.76C69.5463 106.733 94.372 96.8042 131.611 96.8042H702.602" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#5A5D64"/>
      <path d="M100.578 206.019C121.145 206.019 137.817 189.349 137.817 168.787C137.817 148.224 121.145 131.554 100.578 131.554C80.0121 131.554 63.3398 148.224 63.3398 168.787C63.3398 189.349 80.0121 206.019 100.578 206.019Z" fill="#0B0B0C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" stroke="#D9DBE0"/>
      <path d="M615.712 90.5986H367.455C333.178 90.5986 305.391 118.381 305.391 152.653C305.391 186.924 333.178 214.707 367.455 214.707H615.712C649.989 214.707 677.776 186.924 677.776 152.653C677.776 118.381 649.989 90.5986 615.712 90.5986Z" fill="#1F4FD6" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M342.629 189.885H652.95Z" fill="black"/>
      <path d="M342.629 189.885H652.95" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" stroke="#173BA8"/>
      <path d="M435.727 120.385H588.405Z" fill="black"/>
      <path d="M435.727 120.385H588.405" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" stroke="white"/>

      {/* Blue gear */}
      <path d="M301.666 223.394C338.685 223.394 368.695 193.389 368.695 156.376C368.695 119.363 338.685 89.3574 301.666 89.3574C264.647 89.3574 234.637 119.363 234.637 156.376C234.637 193.389 264.647 223.394 301.666 223.394Z" fill="#0B0B0C"/>
      <Spin cx={301.67} cy={156.38} className="press-spin">
      <path d="M294.218 104.25H309.113L311.595 117.902L322.767 122.867L333.939 114.179L343.869 124.108L335.18 135.277L340.145 146.447L353.799 148.929V163.822L340.145 166.304L335.18 177.474L343.869 188.644L333.939 198.573L322.767 189.885L311.595 194.849L309.113 208.501H294.218L291.735 194.849L280.563 189.885L269.392 198.573L259.462 188.644L268.151 177.474L263.185 166.304L249.531 163.822V148.929L263.185 146.447L268.151 135.277L259.462 124.108L269.392 114.179L280.563 122.867L291.735 117.902L294.218 104.25Z" fill="#1F4FD6"/>
      <path d="M301.669 171.269C309.895 171.269 316.564 164.601 316.564 156.376C316.564 148.151 309.895 141.483 301.669 141.483C293.442 141.483 286.773 148.151 286.773 156.376C286.773 164.601 293.442 171.269 301.669 171.269Z" fill="#0B0B0C"/>
      </Spin>

      {/* Middle roller and its gear */}
      <path d="M768.39 234.564H363.731C331.511 234.564 305.391 260.68 305.391 292.895C305.391 325.11 331.511 351.225 363.731 351.225H768.39C800.61 351.225 826.73 325.11 826.73 292.895C826.73 260.68 800.61 234.564 768.39 234.564Z" fill="#24262B" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M839.142 268.073H801.904C788.193 268.073 777.078 279.186 777.078 292.895C777.078 306.603 788.193 317.716 801.904 317.716H839.142C852.853 317.716 863.968 306.603 863.968 292.895C863.968 279.186 852.853 268.073 839.142 268.073Z" fill="#0B0B0C"/>
      <path d="M342.629 330.127H777.079Z" fill="black"/>
      <path d="M342.629 330.127H777.079" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" stroke="#121316"/>
      <path d="M435.727 259.386H683.984Z" fill="black"/>
      <path d="M435.727 259.386H683.984" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" stroke="#D9DBE0"/>
      <path d="M336.426 357.431C372.074 357.431 400.973 328.537 400.973 292.895C400.973 257.252 372.074 228.358 336.426 228.358C300.777 228.358 271.879 257.252 271.879 292.895C271.879 328.537 300.777 357.431 336.426 357.431Z" fill="#0B0B0C"/>
      <Spin cx={336.42} cy={292.89} className="press-spin-reverse">
      <path d="M328.977 243.251H343.873L346.355 256.903L356.285 260.627L367.457 251.939L377.387 261.868L368.698 273.037L372.422 282.966L386.076 285.448V300.341L372.422 302.823L368.698 312.752L377.387 323.922L367.457 333.85L356.285 325.163L346.355 328.886L343.873 342.538H328.977L326.495 328.886L316.564 325.163L305.393 333.85L295.462 323.922L304.151 312.752L300.428 302.823L286.773 300.341V285.448L300.428 282.966L304.151 273.037L295.462 261.868L305.393 251.939L316.564 260.627L326.495 256.903L328.977 243.251Z" fill="#E6E7EA"/>
      <path d="M336.423 307.787C344.649 307.787 351.318 301.12 351.318 292.894C351.318 284.669 344.649 278.001 336.423 278.001C328.196 278.001 321.527 284.669 321.527 292.894C321.527 301.12 328.196 307.787 336.423 307.787Z" fill="#0B0B0C"/>
      </Spin>

      {/* Bottom roller */}
      <path d="M747.288 363.636H360.007C329.843 363.636 305.391 388.084 305.391 418.243C305.391 448.402 329.843 472.851 360.007 472.851H747.288C777.452 472.851 801.905 448.402 801.905 418.243C801.905 388.084 777.452 363.636 747.288 363.636Z" fill="#1A1B1F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <Spin cx={336.43} cy={418.24} className="press-spin">
      <path d="M336.425 472.851C366.589 472.851 391.042 448.402 391.042 418.243C391.042 388.084 366.589 363.636 336.425 363.636C306.261 363.636 281.809 388.084 281.809 418.243C281.809 448.402 306.261 472.851 336.425 472.851Z" fill="#2A2C31" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M336.421 435.618C346.019 435.618 353.799 427.839 353.799 418.243C353.799 408.647 346.019 400.868 336.421 400.868C326.823 400.868 319.043 408.647 319.043 418.243C319.043 427.839 326.823 435.618 336.421 435.618Z" fill="#0B0B0C"/>
      </Spin>

      {/* Body with blinking lights */}
      <path d="M342.629 472.851H628.124V693.763H342.629V472.851Z" fill="#1A1B1F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M503.996 634.192V693.764Z" fill="black"/>
      <path d="M503.996 634.192V693.764" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" stroke="#3D4047"/>
      <g className="press-led"><path d="M398.487 552.28C402.6 552.28 405.934 548.946 405.934 544.834C405.934 540.721 402.6 537.387 398.487 537.387C394.374 537.387 391.039 540.721 391.039 544.834C391.039 548.946 394.374 552.28 398.487 552.28Z" fill="#B9BCC3"/></g>
      <g className="press-led [animation-delay:0.4s]"><path d="M398.487 591.995C402.6 591.995 405.934 588.661 405.934 584.548C405.934 580.435 402.6 577.102 398.487 577.102C394.374 577.102 391.039 580.435 391.039 584.548C391.039 588.661 394.374 591.995 398.487 591.995Z" fill="#B9BCC3"/></g>
      <g className="press-led [animation-delay:0.8s]"><path d="M398.487 631.709C402.6 631.709 405.934 628.375 405.934 624.263C405.934 620.15 402.6 616.816 398.487 616.816C394.374 616.816 391.039 620.15 391.039 624.263C391.039 628.375 394.374 631.709 398.487 631.709Z" fill="#B9BCC3"/></g>

      {/* Printed sheet feeding out */}
      <g clipPath="url(#press-sheet-clip)">
        <g className="press-feed">
          <path d="M379.867 367.359H752.253C779.561 367.359 791.974 379.77 796.939 398.386C814.317 485.262 839.143 559.727 895 634.191H578.473C572.266 534.905 535.028 448.03 472.964 398.386C448.138 379.77 417.106 371.083 379.867 367.359Z" fill="#F4F5F7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
          <path d="M501.516 403.351H593.371L620.679 472.851H533.789L501.516 403.351Z" fill="#1F4FD6"/>
          <path d="M628.125 413.279H715.015Z" fill="black"/>
          <path d="M628.125 413.279H715.015" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" stroke="#2A2C31"/>
          <path d="M634.332 443.065H721.222Z" fill="black"/>
          <path d="M634.332 443.065H721.222" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" stroke="#2A2C31"/>
          <path d="M643.02 472.851H729.909Z" fill="black"/>
          <path d="M643.02 472.851H729.909" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" stroke="#2A2C31"/>
          <path d="M615.711 512.565H746.046Z" fill="black"/>
          <path d="M615.711 512.565H746.046" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" stroke="#2A2C31"/>
          <path d="M628.125 544.834H758.46Z" fill="black"/>
          <path d="M628.125 544.834H758.46" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" stroke="#2A2C31"/>
          <path d="M638.055 577.102H770.872Z" fill="black"/>
          <path d="M638.055 577.102H770.872" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" stroke="#2A2C31"/>
        </g>
      </g>

      {/* Paper stack and feed wheel */}
      <path d="M131.609 686.317H355.041V547.316C280.564 584.548 230.912 634.191 206.086 686.317H131.609Z" fill="#F4F5F7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <Spin cx={131.61} cy={559.73} className="press-spin-slow">
      <path d="M131.611 686.317C201.536 686.317 258.222 629.641 258.222 559.727C258.222 489.813 201.536 433.137 131.611 433.137C61.6857 433.137 5 489.813 5 559.727C5 629.641 61.6857 686.317 131.611 686.317Z" fill="#1A1B1F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M131.612 445.547C104.22 446.579 78.1122 457.427 58.0575 476.111C38.0028 494.796 25.339 520.069 22.3789 547.316" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" stroke="#3D4047"/>
      <path d="M47.2031 559.726C47.2031 537.344 56.096 515.878 71.9255 500.051C87.7549 484.224 109.224 475.333 131.61 475.333" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" stroke="#5A5D64"/>
      <path d="M181.263 627.986C164.802 640.452 144.342 646.451 123.755 644.85C103.168 643.25 83.882 634.159 69.5469 619.299" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" stroke="#5A5D64"/>
      <path d="M131.613 614.334C161.777 614.334 186.229 589.886 186.229 559.727C186.229 529.568 161.777 505.119 131.613 505.119C101.449 505.119 76.9961 529.568 76.9961 559.727C76.9961 589.886 101.449 614.334 131.613 614.334Z" fill="#2A2C31" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M131.609 587.03C146.691 587.03 158.917 574.806 158.917 559.727C158.917 544.647 146.691 532.423 131.609 532.423C116.527 532.423 104.301 544.647 104.301 559.727C104.301 574.806 116.527 587.03 131.609 587.03Z" fill="#0B0B0C"/>
      </Spin>
      <path d="M5 698.728H811.835Z" fill="black"/>
      <path d="M5 698.728H811.835" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
      <path d="M839.145 698.728H856.523Z" fill="black"/>
      <path d="M839.145 698.728H856.523" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" stroke="#0B0B0C"/>
    </svg>
  )
}
