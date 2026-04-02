import React from "react";

type Props = {
  children?: React.ReactNode;
};

export const Header = ({ children }: Props) => {
  return (
    <div className="it-header-center-wrapper">
      <div className="container">
        <div className="row">
          <div className="col-3">
            <div className="it-header-center-content-wrapper">
              <div className="it-brand-wrapper">
                <a href="/">
                  <div className="it-brand-text">
                    <div className="it-brand-title fs-5 fw-bold text-white">
                      EU Public Code
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
          <div className="col-9">{children}</div>
        </div>
      </div>
    </div>
  );
};

Header.displayName = "Header";
